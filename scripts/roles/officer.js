"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { InnocentRole } from "./innocent";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, PlayerHandler } from "../player_handler";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class OfficerRole extends InnocentRole {

    static revealerMarkTag = "revealerMark";
    static CAMPED_PLAYERS_PROPERTY = "campedPlayers";
    static SHOOT_PLAYERS_PROPERTY = "playersToShoot";

    initialize() {
        if (!DeathHandler.onDeathSignal.isConnected(this.onPlayerDeath)) {
            DeathHandler.onDeathSignal.subscribe(this.onPlayerDeath);
        }
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        super.giveToPlayer(player);
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_uses");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);

        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_cooldown");
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(OfficerRole.CAMPED_PLAYERS_PROPERTY, "[]");
        player.setDynamicProperty(OfficerRole.SHOOT_PLAYERS_PROPERTY, "[]");
    }

    /**
     * @param {Player} player
     */
    onPlayerDeath(player, killer) {

        let allPlayers = world.getAllPlayers();
        let officers = PlayerHandler.sortPlayersWithRole(allPlayers, RoleTypes.OFFICER);
        officers.forEach((officer) => {
            if (OfficerRole.hasBeenCamped(officer, player)) {
                if (killer != null) {
                    OfficerRole.addShootablePlayer(officer, killer);
                }

                if (ScoreboardManager.getTrackedObjective("role_settings.officer.notify_on_camped_death") != 0) {
                    officer.sendMessage("§eOne of your camped players has died.");
                    SoundManager.playSoundEffect([player], SoundEffectType.DEATH_NOTIFICATION);
                }

                if (ScoreboardManager.getTrackedObjective("role_settings.officer.camped_death_gives_back_use") != 0) {
                    ScoreboardManager.addScoreboardObjective(player, "player.action_charges", 1);
                    PlayerHandler.updateRoleActionVisual(officer);
                }
            }
        });
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.INNOCENT;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§eOfficer";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Camp players and shoot their killers!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "Mark players with your ability. If you mark a player that killed someone you already marked, you deal damage to them.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.officer.enabled") != 0 && ScoreboardManager.getTrackedObjective("settings.death_handling.enabled") != 0;
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        return [];
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return true;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return RoleTypes.OFFICER;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this role.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this role can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns whether this role counts towards win condition tracking.
     * @returns {boolean}
     */
    countsInTracking(player) {
        return true;
    }

    /**
     * 
     * @param {Player} player 
     * @returns {number[]}
     */
    static getCampedPlayers(player) {
        let players = player.getDynamicProperty(OfficerRole.CAMPED_PLAYERS_PROPERTY);
        if (players == null) {
            return [];
        }
        return JSON.parse(players);
    }

    /**
     * 
     * @param {Player} player 
     * @param {Player} camped 
     */
    static addCampedPlayer(player, camped) {
        let campedPlayers = OfficerRole.getCampedPlayers(player);
        campedPlayers.push(ScoreboardManager.getPlayerID(camped));
        // player.sendMessage("Adding camped player " + camped.name + ", ids now " + JSON.stringify(campedPlayers));
        player.setDynamicProperty(OfficerRole.CAMPED_PLAYERS_PROPERTY, JSON.stringify(campedPlayers));
    }

    /**
     * 
     * @param {Player} player 
     */
    static getNumberOfCampedPlayers(player) {
        return OfficerRole.getCampedPlayers(player).length;
    }

    static hasBeenCamped(officer, player) {
        return OfficerRole.getCampedPlayers(officer).includes(ScoreboardManager.getPlayerID(player));
    }

    /**
     * 
     * @param {Player} player 
     * @returns {number[]}
     */
    static getShootablePlayers(player) {
        let players = player.getDynamicProperty(OfficerRole.SHOOT_PLAYERS_PROPERTY);
        if (players == null) {
            return [];
        }
        return JSON.parse(players);
    }

    /**
     * 
     * @param {Player} player 
     * @param {Player} canShootAt 
     */
    static addShootablePlayer(player, canShootAt) {
        let shootablePlayers = OfficerRole.getShootablePlayers(player);
        shootablePlayers.push(ScoreboardManager.getPlayerID(canShootAt));
        player.setDynamicProperty(OfficerRole.SHOOT_PLAYERS_PROPERTY, JSON.stringify(shootablePlayers));
    }

    /**
     * 
     * @param {Player} player 
     */
    static getNumberOfShootablePlayers(player) {
        return OfficerRole.getShootablePlayers(player).length;
    }
    
    static isShootable(officer, player) {
        return OfficerRole.getShootablePlayers(officer).includes(ScoreboardManager.getPlayerID(player));
    }

    /**
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Player} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("§eYou can't camp anymore people.");
            return;
        }

        if (otherEntity.typeId == "minecraft:player" && chargesRemaining != 0) {
            if (OfficerRole.hasBeenCamped(player, otherEntity)) {
                player.sendMessage("You've already camped that player.");
                return;
            }

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            beforeInteract.interactType = InteractTypes.OFFICER_CAMP;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_cooldown");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                SoundManager.playSoundEffect([player], SoundEffectType.INTERACT_BLOCKED);
                player.sendMessage("§e§oYou were unable to camp " + otherEntity.name + "...");
                ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " tried to camp " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                
                let failedStillMarks = ScoreboardManager.getTrackedObjective("role_settings.officer.failed_camp_prevent_camp") != 0;
                if (failedStillMarks) {
                    OfficerRole.addCampedPlayer(player, otherEntity);
                }
                
                return;
            }

            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            let bulletDamage = ScoreboardManager.getTrackedObjective("role_settings.officer.bullet_damage");
            if (OfficerRole.isShootable(player, otherEntity)) {
                otherEntity.applyDamage(bulletDamage);
            }

            // ability effect
            OfficerRole.addCampedPlayer(player, otherEntity);
            SoundManager.playSoundEffect([player], SoundEffectType.BASIC_MARK);
            
            // ability activate message
            player.sendMessage("§eCamped §r" + otherEntity.name + "§e.");
            ChatManager.sendDeadPlayersMessage("§e§o" + player.name + " camped " + otherEntity.name + ".", LogItemType.ABILITY_MESSAGE);
            
            // cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, InteractTypes.OFFICER_CAMP);
            player.setDynamicProperty(PlayerHandler.INTERACTED_THIS_FRAME_PROPERTY, true);
        }
    }

    /**
     * Returns if this role has met its win condition.
     * Innocent and Murderer wins are handled separately.
     * @param {Player} player 
     * @param {RoleAlignment} winningAlignment
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this role and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Officer Settings");

        form.divider();
        form.label("The officer is an innocent role that is able to camp players. A play that kills a camped player becomes shootable. If the officer camps a shootable player, the officer deals damage to the shootable player. They may only camp each player once.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.officer.enabled") != 0;
        form.toggle("Officer Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_cooldown");
        form.slider("Mark Cooldown", SettingsHandler.powerAbilityCooldownMin, 300, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The cooldown between marking players.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_uses");
        form.slider("Mark Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times mark can be used. -1 is infinite uses");
        
        let deathCharge = ScoreboardManager.getTrackedObjective("role_settings.officer.camped_death_gives_back_use") != 0;
        form.toggle("Marked Death Redeems Mark", { defaultValue: deathCharge }); // 8
        form.label("If a person dies with revealer mark, the revealer will get their mark back.");
        
        let notifyOnDeath = ScoreboardManager.getTrackedObjective("role_settings.officer.notify_on_camped_death") != 0;
        form.toggle("Notify On Camped Death", { defaultValue: notifyOnDeath }); // 10
        form.label("If true, will message the officer when one of the players they've camped dies.");
        
        let bulletDamage = ScoreboardManager.getTrackedObjective("role_settings.officer.bullet_damage");
        form.slider("Bullet Damage", 1, 20, { defaultValue: bulletDamage }); // 12
        form.label("The amount of damage in half hearts that camping a shootable player deals.");
        
        let failedStillMarks = ScoreboardManager.getTrackedObjective("role_settings.officer.failed_camp_prevent_camp") != 0;
        form.toggle("Failed Camp Still Marks", { defaultValue: failedStillMarks }); // 14
        form.label("If true and someone cancels the camp interaction, the player will still get marked.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            ScoreboardManager.setTrackedObjective("role_settings.officer.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.officer.camp_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.officer.camp_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.officer.camped_death_gives_back_use", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.officer.notify_on_camped_death", r.formValues[10] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings.officer.bullet_damage", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.officer.failed_camp_prevent_camp", r.formValues[14] ? 1 : 0);
            
            callback(player);
        });
    }
    
    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
    */
   getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.officer.camp_uses");
        let deathCharge = ScoreboardManager.getTrackedObjective("role_settings.officer.camped_death_gives_back_use") != 0;
        let notifyOnDeath = ScoreboardManager.getTrackedObjective("role_settings.officer.notify_on_camped_death") != 0;
        let bulletDamage = ScoreboardManager.getTrackedObjective("role_settings.officer.bullet_damage");
        let failedStillMarks = ScoreboardManager.getTrackedObjective("role_settings.officer.failed_camp_prevent_camp") != 0;

       let description = "The officer is an innocent role that is able to camp players and shoot any players that kills a camped player.";
        description += "\n\nCamp Cooldown: " + cooldownTime + " seconds.";
        description += "\nCamp Uses: " + abilityUses;
        description += "\nDead Player Gives Back Camp: " + deathCharge;
        description += "\nNotify on Camped Death: " + notifyOnDeath;
        description += "\nBullet Damage: " + (bulletDamage / 2) + " hearts";
        description += "\nFailed Camp Still Marks: " + failedStillMarks;
        return description;
    }
}