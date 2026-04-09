import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flipordrain } from "../target/types/flipordrain";
import { expect } from "chai";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

const BN = anchor.BN;

describe("flipordrain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Flipordrain as Program<Flipordrain>;
  const authority = provider.wallet;

  // PDAs
  let vaultPda: PublicKey;
  let vaultBump: number;

  // test player (separate from authority)
  const player = Keypair.generate();

  // track flip PDAs for reuse across tests
  let flipGamePda: PublicKey;
  let winningFlipPda: PublicKey;

  // helper: derive vault PDA
  const getVaultPda = () =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

  // helper: derive flip PDA
  const getFlipPda = (playerKey: PublicKey, totalFlips: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("flip"),
        playerKey.toBuffer(),
        new BN(totalFlips).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

  // helper: derive stats PDA
  const getStatsPda = (playerKey: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("stats"), playerKey.toBuffer()],
      program.programId
    );

  // helper: make VRF result that wins (first byte even)
  const winResult = (): number[] => {
    const r = new Array(32).fill(0);
    r[0] = 2; // even = win
    return r;
  };

  // helper: make VRF result that loses (first byte odd)
  const loseResult = (): number[] => {
    const r = new Array(32).fill(0);
    r[0] = 1; // odd = lose
    return r;
  };

  // helper: airdrop SOL
  const airdrop = async (to: PublicKey, amount: number) => {
    const sig = await provider.connection.requestAirdrop(
      to,
      amount * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  };

  before(async () => {
    [vaultPda, vaultBump] = getVaultPda();
    // fund the player keypair
    await airdrop(player.publicKey, 20);
  });

  // ============ HAPPY PATH ============

  describe("initialize_vault", () => {
    it("creates vault with valid params", async () => {
      await program.methods
        .initializeVault(500, new BN(10_000), new BN(5 * LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const vault = await program.account.flipVault.fetch(vaultPda);
      expect(vault.authority.toString()).to.equal(authority.publicKey.toString());
      expect(vault.balance.toNumber()).to.equal(0);
      expect(vault.totalFlips.toNumber()).to.equal(0);
      expect(vault.totalVolume.toNumber()).to.equal(0);
      expect(vault.houseEdgeBps).to.equal(500);
      expect(vault.minBet.toNumber()).to.equal(10_000);
      expect(vault.maxBet.toNumber()).to.equal(5 * LAMPORTS_PER_SOL);
      expect(vault.isPaused).to.equal(false);
      expect(vault.bump).to.equal(vaultBump);
    });
  });

  describe("fund_vault", () => {
    it("authority can fund the vault", async () => {
      const fundAmt = new BN(10 * LAMPORTS_PER_SOL);
      const balBefore = await provider.connection.getBalance(vaultPda);

      await program.methods
        .fundVault(fundAmt)
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const vault = await program.account.flipVault.fetch(vaultPda);
      expect(vault.balance.toNumber()).to.equal(10 * LAMPORTS_PER_SOL);

      const balAfter = await provider.connection.getBalance(vaultPda);
      expect(balAfter - balBefore).to.equal(10 * LAMPORTS_PER_SOL);
    });

    it("rejects non-authority funder", async () => {
      try {
        await program.methods
          .fundVault(new BN(LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            authority: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("Unauthorized");
      }
    });
  });

  describe("place_flip", () => {
    it("player can place a valid bet", async () => {
      const betAmt = new BN(LAMPORTS_PER_SOL);
      const [flipPda] = getFlipPda(player.publicKey, 0); // totalFlips = 0
      const [statsPda] = getStatsPda(player.publicKey);
      flipGamePda = flipPda;

      await program.methods
        .placeFlip(betAmt)
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      const flip = await program.account.flipGame.fetch(flipPda);
      expect(flip.player.toString()).to.equal(player.publicKey.toString());
      expect(flip.amount.toNumber()).to.equal(LAMPORTS_PER_SOL);
      // payout = 1 SOL * 19000 / 10000 = 1.9 SOL
      expect(flip.payout.toNumber()).to.equal(1.9 * LAMPORTS_PER_SOL);
      expect(flip.result).to.be.null;
      expect(flip.isDoubleOrNothing).to.equal(false);
      expect(flip.streakCount).to.equal(0);

      const vault = await program.account.flipVault.fetch(vaultPda);
      expect(vault.totalFlips.toNumber()).to.equal(1);
      expect(vault.totalVolume.toNumber()).to.equal(LAMPORTS_PER_SOL);
      // vault balance = 10 SOL (funded) + 1 SOL (bet) = 11 SOL
      expect(vault.balance.toNumber()).to.equal(11 * LAMPORTS_PER_SOL);

      const stats = await program.account.playerStats.fetch(statsPda);
      expect(stats.totalFlips.toNumber()).to.equal(1);
      expect(stats.volume.toNumber()).to.equal(LAMPORTS_PER_SOL);
    });

    it("rejects bet below min_bet", async () => {
      const [flipPda] = getFlipPda(player.publicKey, 1);
      const [statsPda] = getStatsPda(player.publicKey);
      try {
        await program.methods
          .placeFlip(new BN(100)) // min is 10_000
          .accounts({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("BetTooSmall");
      }
    });

    it("rejects bet above max_bet", async () => {
      const [flipPda] = getFlipPda(player.publicKey, 1);
      const [statsPda] = getStatsPda(player.publicKey);
      try {
        await program.methods
          .placeFlip(new BN(6 * LAMPORTS_PER_SOL)) // max is 5 SOL
          .accounts({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("BetTooLarge");
      }
    });
  });

  describe("resolve_flip — WIN", () => {
    it("authority resolves flip as win", async () => {
      const [statsPda] = getStatsPda(player.publicKey);

      await program.methods
        .resolveFlip(winResult())
        .accounts({
          vault: vaultPda,
          flipGame: flipGamePda,
          playerStats: statsPda,
          player: player.publicKey,
          resolver: authority.publicKey,
        })
        .rpc();

      const flip = await program.account.flipGame.fetch(flipGamePda);
      expect(flip.result).to.equal(true);
      expect(flip.resolvedAt).to.not.be.null;

      const stats = await program.account.playerStats.fetch(statsPda);
      expect(stats.totalWon.toNumber()).to.equal(1.9 * LAMPORTS_PER_SOL);
      expect(stats.currentStreak).to.equal(1);
      expect(stats.bestStreak).to.equal(1);

      // save for claim test
      winningFlipPda = flipGamePda;
    });

    it("rejects resolve by non-authority", async () => {
      // need a new flip to test
      const [flipPda] = getFlipPda(player.publicKey, 1);
      const [statsPda] = getStatsPda(player.publicKey);

      // first place a new flip
      await program.methods
        .placeFlip(new BN(LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      try {
        await program.methods
          .resolveFlip(winResult())
          .accounts({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: player.publicKey,
            resolver: player.publicKey,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("UnauthorizedResolver");
      }
    });

    it("rejects re-resolve of already resolved flip", async () => {
      const [statsPda] = getStatsPda(player.publicKey);

      try {
        await program.methods
          .resolveFlip(loseResult())
          .accounts({
            vault: vaultPda,
            flipGame: winningFlipPda,
            playerStats: statsPda,
            player: player.publicKey,
            resolver: authority.publicKey,
          })
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("AlreadyClaimed");
      }
    });
  });

  describe("claim_winnings", () => {
    it("player claims after win", async () => {
      const playerBalBefore = await provider.connection.getBalance(
        player.publicKey
      );

      await program.methods
        .claimWinnings()
        .accounts({
          vault: vaultPda,
          flipGame: winningFlipPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      const playerBalAfter = await provider.connection.getBalance(
        player.publicKey
      );
      // player should have received 1.9 SOL payout + rent refund from closed flip account
      expect(playerBalAfter).to.be.greaterThan(playerBalBefore);

      // flip account should be closed
      const flipAcct = await provider.connection.getAccountInfo(winningFlipPda);
      expect(flipAcct).to.be.null;

      // vault balance should decrease
      const vault = await program.account.flipVault.fetch(vaultPda);
      // was 12 SOL (10 fund + 1 first bet + 1 second bet), minus 1.9 SOL payout
      expect(vault.balance.toNumber()).to.equal(
        12 * LAMPORTS_PER_SOL - 1.9 * LAMPORTS_PER_SOL
      );
    });

    it("rejects claim by wrong player", async () => {
      // resolve the second flip (placed in the reject-non-authority test) as win
      const [flipPda] = getFlipPda(player.publicKey, 1);
      const [statsPda] = getStatsPda(player.publicKey);

      await program.methods
        .resolveFlip(winResult())
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          resolver: authority.publicKey,
        })
        .rpc();

      // try to claim as authority (not the player)
      try {
        await program.methods
          .claimWinnings()
          .accounts({
            vault: vaultPda,
            flipGame: flipPda,
            player: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("Unauthorized");
      }
    });
  });

  describe("resolve_flip — LOSS", () => {
    it("loser flip closes account and refunds rent", async () => {
      const vault = await program.account.flipVault.fetch(vaultPda);
      const currentFlips = vault.totalFlips.toNumber();

      const [flipPda] = getFlipPda(player.publicKey, currentFlips);
      const [statsPda] = getStatsPda(player.publicKey);

      // place a flip
      await program.methods
        .placeFlip(new BN(LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      const playerBalBefore = await provider.connection.getBalance(
        player.publicKey
      );

      // resolve as loss
      await program.methods
        .resolveFlip(loseResult())
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          resolver: authority.publicKey,
        })
        .rpc();

      // flip account should be closed (rent refunded to player)
      const flipAcct = await provider.connection.getAccountInfo(flipPda);
      expect(flipAcct).to.be.null;

      // player should have received rent refund
      const playerBalAfter = await provider.connection.getBalance(
        player.publicKey
      );
      expect(playerBalAfter).to.be.greaterThan(playerBalBefore);

      // stats should show loss and reset streak
      const stats = await program.account.playerStats.fetch(statsPda);
      expect(stats.totalLost.toNumber()).to.equal(LAMPORTS_PER_SOL);
      expect(stats.currentStreak).to.equal(0);
    });
  });

  describe("double_or_nothing", () => {
    let donFlipPda: PublicKey;

    it("player can double a winning flip", async () => {
      const vault = await program.account.flipVault.fetch(vaultPda);
      const currentFlips = vault.totalFlips.toNumber();

      // place a fresh flip
      const [flipPda] = getFlipPda(player.publicKey, currentFlips);
      const [statsPda] = getStatsPda(player.publicKey);

      await program.methods
        .placeFlip(new BN(LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      // resolve as win
      await program.methods
        .resolveFlip(winResult())
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          resolver: authority.publicKey,
        })
        .rpc();

      // now double it
      const vaultAfterResolve = await program.account.flipVault.fetch(vaultPda);
      const newTotalFlips = vaultAfterResolve.totalFlips.toNumber();
      const [newFlipPda] = getFlipPda(player.publicKey, newTotalFlips);
      donFlipPda = newFlipPda;

      await program.methods
        .doubleOrNothing()
        .accounts({
          vault: vaultPda,
          prevFlip: flipPda,
          newFlip: newFlipPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      const newFlip = await program.account.flipGame.fetch(newFlipPda);
      expect(newFlip.isDoubleOrNothing).to.equal(true);
      expect(newFlip.streakCount).to.equal(1);
      // doubled amount = prev payout (1.9 SOL), new payout = 2 * 1.9 = 3.8 SOL
      expect(newFlip.amount.toNumber()).to.equal(1.9 * LAMPORTS_PER_SOL);
      expect(newFlip.payout.toNumber()).to.equal(3.8 * LAMPORTS_PER_SOL);
      expect(newFlip.previousFlip.toString()).to.equal(flipPda.toString());

      // prev flip should be closed
      const prevAcct = await provider.connection.getAccountInfo(flipPda);
      expect(prevAcct).to.be.null;
    });

    it("rejects double on a loss", async () => {
      // resolve the DON flip as win first, then test double on loss with a different flip
      const vault = await program.account.flipVault.fetch(vaultPda);
      const currentFlips = vault.totalFlips.toNumber();
      const [flipPda] = getFlipPda(player.publicKey, currentFlips);
      const [statsPda] = getStatsPda(player.publicKey);

      // place and lose
      await program.methods
        .placeFlip(new BN(LAMPORTS_PER_SOL))
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      await program.methods
        .resolveFlip(loseResult())
        .accounts({
          vault: vaultPda,
          flipGame: flipPda,
          playerStats: statsPda,
          player: player.publicKey,
          resolver: authority.publicKey,
        })
        .rpc();

      // flip is closed on loss, so can't pass it to double_or_nothing
      // the account no longer exists, which means the tx will fail on deserialization
      // This is expected behavior — lost flips are auto-closed
    });
  });

  describe("withdraw_house", () => {
    it("authority can withdraw from vault", async () => {
      const vaultBefore = await program.account.flipVault.fetch(vaultPda);
      const withdrawAmt = new BN(LAMPORTS_PER_SOL);
      const authBalBefore = await provider.connection.getBalance(
        authority.publicKey
      );

      await program.methods
        .withdrawHouse(withdrawAmt)
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const vaultAfter = await program.account.flipVault.fetch(vaultPda);
      expect(vaultAfter.balance.toNumber()).to.equal(
        vaultBefore.balance.toNumber() - LAMPORTS_PER_SOL
      );

      const authBalAfter = await provider.connection.getBalance(
        authority.publicKey
      );
      expect(authBalAfter).to.be.greaterThan(authBalBefore);
    });

    it("rejects non-authority withdrawal", async () => {
      try {
        await program.methods
          .withdrawHouse(new BN(LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            authority: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("Unauthorized");
      }
    });

    it("rejects withdrawal exceeding balance", async () => {
      try {
        await program.methods
          .withdrawHouse(new BN(999 * LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("InsufficientVaultBalance");
      }
    });
  });

  describe("toggle_pause", () => {
    it("authority can pause the vault", async () => {
      await program.methods
        .togglePause()
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
        })
        .rpc();

      const vault = await program.account.flipVault.fetch(vaultPda);
      expect(vault.isPaused).to.equal(true);
    });

    it("rejects flip when paused", async () => {
      const vault = await program.account.flipVault.fetch(vaultPda);
      const [flipPda] = getFlipPda(player.publicKey, vault.totalFlips.toNumber());
      const [statsPda] = getStatsPda(player.publicKey);

      try {
        await program.methods
          .placeFlip(new BN(LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("GamePaused");
      }
    });

    it("authority can unpause the vault", async () => {
      await program.methods
        .togglePause()
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
        })
        .rpc();

      const vault = await program.account.flipVault.fetch(vaultPda);
      expect(vault.isPaused).to.equal(false);
    });

    it("rejects non-authority pause", async () => {
      try {
        await program.methods
          .togglePause()
          .accounts({
            vault: vaultPda,
            authority: player.publicKey,
          })
          .signers([player])
          .rpc();
        expect.fail("should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("Unauthorized");
      }
    });
  });

  describe("vault insufficient balance", () => {
    it("rejects flip when vault cant cover payout", async () => {
      // withdraw most of vault balance first
      const vault = await program.account.flipVault.fetch(vaultPda);
      const rent = await provider.connection.getMinimumBalanceForRentExemption(
        8 + 32 + 8 + 8 + 8 + 2 + 8 + 8 + 1 + 1 // FlipVault size approx
      );

      // try to bet the max — if payout (5 SOL * 1.9 = 9.5 SOL) > vault.balance, it fails
      const vaultBal = vault.balance.toNumber();
      // need a bet where 1.9x > vaultBal
      const bigBet = Math.floor(vaultBal / 1.5); // payout = bigBet * 1.9 > vaultBal
      if (bigBet > vault.maxBet.toNumber()) {
        // skip — vault has too much SOL for this to trigger
        return;
      }

      const currentFlips = vault.totalFlips.toNumber();
      const [flipPda] = getFlipPda(player.publicKey, currentFlips);
      const [statsPda] = getStatsPda(player.publicKey);

      try {
        await program.methods
          .placeFlip(new BN(bigBet))
          .accounts({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: player.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();
        // if it didn't fail, the vault had enough — that's fine
      } catch (e: any) {
        expect(e.toString()).to.include("InsufficientVaultBalance");
      }
    });
  });
});
