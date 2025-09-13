<script context="module" lang="ts">
    // Disable SSR for this route to avoid importing Phaser on the server
    export const ssr = false;
</script>

<script lang="ts">
    import { onMount } from "svelte";
    
    let game: import("phaser").Game | undefined;
    
    onMount(async () => {
        const Phaser = await import("phaser");
        const { default: MainScene } = await import("$lib/scenes/MainScene");

        const config: import("phaser").Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: 1280,
            height: 768,
            backgroundColor: "#1a1a1a",
            parent: "phaser-container",
            scene: [MainScene]
        };
    
        game = new Phaser.Game(config);
    });
    </script>
    
    <div id="phaser-container"></div>

    <style>
        :global(body) {
            margin: 0;
            background: #1a1a1a;
        }
        #phaser-container {
            width: 1280px;
            height: 768px;
            margin: 0 auto; /* center horizontally */
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>