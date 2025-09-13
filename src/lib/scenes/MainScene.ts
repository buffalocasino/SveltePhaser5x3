import Phaser from "phaser";
import ReelPrefab from "../prefabs/ReelPrefab";

// Spin speed presets
const SpinSpeed = {
    SLOW:   { durationMultiplier: 1.5, extraSpins: 3 },
    NORMAL: { durationMultiplier: 1.0, extraSpins: 3 },
    TURBO:  { durationMultiplier: 0.5, extraSpins: 2 },
} as const;

export default class MainScene extends Phaser.Scene {
    reels: ReelPrefab[] = [];
    private spinning = false;
    private currentSpeed: keyof typeof SpinSpeed = 'NORMAL';

    constructor() {
        super({ key: "MainScene" });
    }
    preload() {
        // Prefer the atlas for 128px frames
        this.load.atlas("reel", "/reelicons.png", "/reelicons.json");
        // Background image
        this.load.image("bg", "/bg.png");
        // UI assets
        this.load.image("playBtn", "/ui/play.png");
    }
    

    create() {
        // Canvas is 1280x768; center the bank and windows
        const canvasW = 1280;
        const canvasH = 768;
        const centerX = canvasW / 2;
        const centerY = canvasH / 2; // 384

        // Draw background covering the entire canvas
        const bg = this.add.image(centerX, centerY, "bg").setDepth(-100);
        bg.setDisplaySize(canvasW, canvasH);

        // Compute reel positions (5 reels), 128px wide windows with no spacing
        const symbolWidth = 128;
        const gap = 0; // no pixels between reels
        const spacing = symbolWidth + gap; // 128
        const offsets = [-2, -1, 0, 1, 2];
        const reelX = offsets.map(off => centerX + off * spacing);
        const reelY = centerY; // center vertically

        // Define logical symbol keys per reel (different lengths ok)
        const reelStrips: string[][] = [
            ['l1','h1','scatter','l2','wild','h2','l3','h3'],
            ['h1','l2','l1','h2','wild','scatter','l4','h3'],
            ['l1','l2','h1','h2','scatter','wild','l3','h3','l4'],
            ['h1','l1','h2','scatter','l2','wild','l3','h3'],
            ['l2','h1','l3','h2','scatter','wild','l1','h4']
        ];

        // Map logical keys to atlas frame names (updated: no '256/' prefix)
        const toFrame = (key: string) => `${key}.png`;
        const getSpinSymbols = (reelIndex: number, numSymbols: number) => {
            const reel = reelStrips[reelIndex];
            const stripLength = reel.length;
            const startIndex = Math.floor(Math.random() * stripLength);
            const spinSymbols: string[] = [];
            for (let i = 0; i < numSymbols; i++) {
                const symbolIndex = (startIndex + i) % stripLength;
                spinSymbols.push(toFrame(reel[symbolIndex]));
            }
            return spinSymbols;
        };

        // Create reels
        reelX.forEach((x, i) => {
            const reel = new ReelPrefab(this, x, reelY);
            // Build a long strip (e.g., 100 symbols) from the atlas frames
            const stripFrames = getSpinSymbols(i, 100);
            reel.setStrip(stripFrames, 128);

            // Create a filled Graphics rect as the mask shape (not visible)
            const maskGfx = this.add.graphics();
            maskGfx.fillStyle(0xffffff, 1);
            // Position the rect so it centers on (x, reelY)
            maskGfx.fillRect(x - 64, reelY - 192, 128, 384);
            maskGfx.setVisible(false);

            // Debug outline to see the mask window area
            const outline = this.add.rectangle(x, reelY, 128, 384)
                .setStrokeStyle(2, 0xff0000)
                .setVisible(true);

            reel.setMask(maskGfx.createGeometryMask());
            this.reels.push(reel);
        });

        // Position controls 40px below the reel windows and centered horizontally
        const bankCenterX = (reelX[0] + reelX[reelX.length - 1]) / 2;
        const reelBottomY = reelY + 384 / 2; // bottom edge of window area
        const controlsY = reelBottomY + 40;

        const controls = this.add.container(bankCenterX, controlsY).setDepth(10);

        // Speed button UI to cycle SLOW -> NORMAL -> TURBO -> SLOW
        const speedButton = this.add.text(0, 0, `Speed: ${this.currentSpeed}`, {
            fontSize: "20px",
            color: "#ffffff",
            backgroundColor: "#00000080",
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        speedButton.on('pointerdown', () => {
            if (this.currentSpeed === 'SLOW') this.currentSpeed = 'NORMAL';
            else if (this.currentSpeed === 'NORMAL') this.currentSpeed = 'TURBO';
            else this.currentSpeed = 'SLOW';
            speedButton.setText(`Speed: ${this.currentSpeed}`);
        });

        // Spin button image, to the right of the speed toggle
        const spinBtn = this.add.image(0, 0, "playBtn")
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        // Optionally scale the button to a nice size if it's too large/small
        // spinBtn.setDisplaySize(160, 64);

        // Layout side-by-side with spacing
        const controlsSpacing = 180; // horizontal pixels between centers (allow for image width)
        speedButton.x = -controlsSpacing / 2;
        spinBtn.x = controlsSpacing / 2;
        controls.add([speedButton, spinBtn]);

        spinBtn.on("pointerdown", () => {
            if (this.spinning) return;
            this.spinning = true;
            const baseDuration = 1500;
            const durationStep = 300;
            const delayStep = 200;
            const baseSpins = 3; // baseline full spins
            const speed = SpinSpeed[this.currentSpeed];

            this.reels.forEach((reel, index) => {
                const duration = (baseDuration + index * durationStep) * speed.durationMultiplier;
                const delay = (index * delayStep) * speed.durationMultiplier;
                const spins = (speed.extraSpins + index); // later reels spin more

                // Choose a final symbol index within the strip to stop on (centered)
                const finalIndex = Math.floor(Math.random() * reel.stripLength());
                const tween = reel.spinTo(finalIndex, { duration, delay, spins, ease: "Cubic.easeInOut" });
                if (index === this.reels.length - 1 && tween) {
                    tween.once("complete", () => {
                        this.spinning = false;
                    });
                }
            });
        });
    }
}
