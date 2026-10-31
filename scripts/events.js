"use strict";

import { world, system } from "@minecraft/server";

import { ActionFormData } from "@minecraft/server-ui";

import { PlayerIconData } from "./player_icon_data";

export class Events {
    constructor(event, player) {
        this.event = event;
        this.player = player;
    }

    showAllPlayers() {
        let form = new ActionFormData();
        form.title("What player are you guessing?")
    }



    // showFunctionSelector() {
    //     let form = new ActionFormData();
    //     form.title("Guess Player");
    //     form.body("Select the player you want to guess the role of.");

    //     let pd = new PlayerIconData();

    //     let players = world.getAllPlayers();
    //     players.forEach((i) => {
    //         form.button(i.name, pd.data[i.name.charAt(0).toLowerCase()]);
    //     });

    //     form
    //         .show(this.player)
    //         .then((r) => {
    //             if (r.canceled) return;

    //             let response = r.selection;
    //         })
    //         .catch((e) => {
    //             console.error(e, e.stack);
    //         });
    // }
}