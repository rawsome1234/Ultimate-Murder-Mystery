"use strict";

import { world, system, Player } from "@minecraft/server";

import { ScoreboardManager } from "./scoreboard_manager";
import { SoundEffectType, SoundManager } from "./sound_manager";
import { DeathHandler } from "./death_handler";

export class InputManager {

    static SWORD_CLICK_SCOREBOARD = "player.time_since_sword_click";
    static MODIFIER_ACTIVATE_TIME = 10;

    /**
    //  * @type {number[]}
    //  */
    // static abilityOnCooldownPlayerIDs = [];

    /**
     * 
     */
    static update() {
        // world.afterEvents.input/
        let allPlayers = world.getAllPlayers();

        if (!ScoreboardManager.isGameRunning()) {
            return;
        }

        allPlayers.forEach((pl) => {
            if (DeathHandler.consideredDead(pl)) {
                return;
            }
            let currentCooldown = ScoreboardManager.getScoreboardObjective(pl, "player.modifier_cooldown");
            if (currentCooldown > 0) {
                ScoreboardManager.addScoreboardObjective(pl, "player.modifier_cooldown", -1);
                if (currentCooldown == 1) {
                    pl.sendMessage("Your modifier ability is ready!");
                    SoundManager.playSoundEffect([pl], SoundEffectType.ABILITY_READY);
                }
            }

            let roleActionCooldown = pl.getItemCooldown("role_action");
            if (roleActionCooldown == 1) {// && !this.abilityOnCooldownPlayerIDs.includes(pl.id)) {
                pl.sendMessage("Your role ability is ready!");
                    SoundManager.playSoundEffect([pl], SoundEffectType.ABILITY_READY);
                // this.abilityOnCooldownPlayerIDs.push(pl.id);
            }

            let guessActionCooldown = pl.getItemCooldown("guessing_action");
            if (guessActionCooldown == 1 && ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0) {// && !this.abilityOnCooldownPlayerIDs.includes(pl.id)) {
                pl.sendMessage("Role Guessing is ready!");
                SoundManager.playSoundEffect([pl], SoundEffectType.ABILITY_READY);
                // this.abilityOnCooldownPlayerIDs.push(pl.id);
            }

            ScoreboardManager.addScoreboardObjective(pl, InputManager.SWORD_CLICK_SCOREBOARD, 1);
            // else if (roleActionCooldown == 0 &&)
        });
    }

    /**
     * Resets the time since last sword click and returns the time there was.
     * @param {Player} player 
     * @returns 
     */
    static resetSwordClick(player) {
        let currentTime = ScoreboardManager.getScoreboardObjective(player, InputManager.SWORD_CLICK_SCOREBOARD);
        ScoreboardManager.setScoreboardObjective(player, InputManager.SWORD_CLICK_SCOREBOARD, 0);
        return currentTime;
    }

}