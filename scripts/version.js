"use strict";

const VERSION = "0.0.2";

export class Version {
    constructor(event, player) {
        this.event = event;
        this.player = player;
    }

    version(version) {
        this.player.onScreenDisplay.setActionBar(VERSION);
    }
}