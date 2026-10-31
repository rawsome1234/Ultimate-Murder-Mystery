"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment, RoleTypes } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { PlayerHandler } from "../player_handler";
import { CustomRoleManager } from "../custom_role_manager";
import { LogItemType } from "../logs/game_log";

export class CustomRole extends Role {

    static customRoleNextID = 0;

    constructor(roleID, roleDisplayName, roleDescription, roleHelpDescription, roleAlignment, roleNumber) {
        super();
        if (roleNumber == null) {
            roleNumber = CustomRole.customRoleNextID;
            CustomRole.customRoleNextID++;
        }
        this.roleCustomData = new CustomRoleData(roleID, roleDisplayName, roleDescription, roleHelpDescription, roleAlignment, roleNumber);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Created role " + roleDisplayName + " with custom id " + roleNumber));
        
        ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".enabled");
        ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".role_count");
        if (ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".weight")) {
            ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".weight", 50);
        }
        ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".action_uses");
        ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time");
        ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".can_see_ghosts");
        ScoreboardManager.createScoreboardObjective("role_settings." + this.roleCustomData.roleID + ".ability_type");
        ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".action_uses", -1);
        ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time", 90);
    }

    /**
     * Loads and returns a CustomRole
     * @param {CustomRoleData} roleData
     * @param {boolean} useNewID 
     * @returns {CustomRole}
     */
    static loadCustomRoleData(roleData, useNewID) {
        return new CustomRole(roleData.roleID, roleData.roleName, roleData.roleDescription, roleData.roleHelpDescription, CustomRoleData.alignmentIDToAlignment(roleData.alignmentID), useNewID == null || useNewID ? null : roleData.numericID);
    }

    /**
     * Gets and returns a string representing this role's custom data.
     * @returns {string}
     */
    getSaveData() {
        return this.roleCustomData;
    }

    /**
     * 
     * @param {*} obj 
     * @returns {CustomRole}
     */
    static importCustomRole(obj) {
        if (!Object.hasOwn(obj, "custom_data")) {
            return;
        }

        let customRole = CustomRole.loadCustomRoleData(obj.custom_data, true);
        ScoreboardManager.setTrackedObjective("role_settings." + customRole.roleCustomData.roleID + ".cooldown_time", obj.cooldown);
        ScoreboardManager.setTrackedObjective("role_settings." + customRole.roleCustomData.roleID + ".action_uses", obj.ability_uses);
        ScoreboardManager.setTrackedObjective("role_settings." + customRole.roleCustomData.roleID + ".can_see_ghosts", obj.can_see_ghosts);
        ScoreboardManager.setTrackedObjective("role_settings." + customRole.roleCustomData.roleID + ".ability_type", obj.ability_type);
        return customRole;
    }

    getDataForExport() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".action_uses");
        let canSeeGhosts = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".can_see_ghosts");
        let abilityType = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".ability_type");
        return { custom_data: this.roleCustomData, ability_uses: abilityUses, cooldown: cooldownTime, can_see_ghosts: canSeeGhosts, ability_type: abilityType };
    }

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        super.initialize();
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".action_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return this.roleCustomData.roleAlignment;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return this.roleCustomData.roleName;
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return this.roleCustomData.roleDescription;
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return this.roleCustomData.roleHelpDescription;
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".enabled");
    }

    /**
     * Returns if this role can see ghost bodies.
     */
    canSeeGhosts() {
        return ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".can_see_ghosts");
    }

    /**
     * Returns an array of alignments this role can guess.
     * 
     * @returns {RoleAlignment[]}
     */
    getGuessAlignments() {
        if (this.getAlignment() == RoleAlignment.MURDERER) {
            let guessable = ScoreboardManager.getTrackedObjective("settings.role_guessing.murderer_guess_type");
            let values = [];
            values.push(RoleAlignment.INNOCENT);
            if (guessable > 0) {
                values.push(RoleAlignment.NEUTRAL_INDEPENDENT);
            }
            if (guessable > 1) {
                values.push(RoleAlignment.NEUTRAL_KILLER);
            }
            return values;
        }
        return [];
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    canUseAbility(player) {
        return ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".ability_type") != 0;
    }

    /**
     * Returns the type identifier for this role.
     * 
     * @returns {RoleTypes}
     */
    getRoleType() {
        return {id: 53, custom_id: this.roleCustomData.numericID, name: this.roleCustomData.roleID };
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
     * Activates the ability of this role for the given player. Assumes
     * the player has this role.
     */
    activateAbility(player) {
        let abilityType = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".ability_type");
        if (abilityType <= 1) {
            return;
        }

        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            player.sendMessage("Used ability!");
            ChatManager.sendDeadPlayersMessage(player.name + " used their ability.", LogItemType.ABILITY_MESSAGE);

            // ability activate message

            // sets cooldown
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time");
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
        let abilityType = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".ability_type");
        if (abilityType == 0 || abilityType == 2) {
            return;
        }

        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (chargesRemaining != 0 && otherEntity.typeId == "minecraft:player") {

            let beforeInteract = PlayerHandler.beforePlayerInteract;
            beforeInteract.resetSignal();
            let interactType = { id: 22, related_role: this.getRoleType(), is_negative: this.getAlignment(player).is_killer};
            beforeInteract.interactType = interactType;
            let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time");
            let cancelInteraction = beforeInteract.emitInteract(player, otherEntity);
            if (cancelInteraction) {
                player.sendMessage("§oYou were unable to interact with " + otherEntity.name);
                ChatManager.sendDeadPlayersMessage("§o" + player.name + " tried to interact with " + otherEntity.name + " but failed...", LogItemType.ABILITY_MESSAGE);
                ScoreboardManager.setPlayerActionCooldown(player, beforeInteract.failCooldown == -1 ? actionCooldown : beforeInteract.failCooldown);
                return;
            }


            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + chargesRemaining + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }

            // ability effect
            player.sendMessage("Interacted with " + otherEntity.name);
            ChatManager.sendDeadPlayersMessage(player.name + " interacted with " + otherEntity.name, LogItemType.ABILITY_MESSAGE);

            // ability activate message

            // sets cooldown
            ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
            PlayerHandler.afterPlayerInteract.emitInteract(player, otherEntity, interactType);
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
        form.title(this.getDisplayName() + "§r Settings");

        form.divider();
        form.label("The " + this.getDisplayName() + " is a custom role. " + this.getRoleDescription());

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".enabled") != 0;
        form.toggle(this.getDisplayName() + "§r Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time");
        form.slider("Ability Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".action_uses");
        form.slider("Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times the ability can be used. -1 is infinite uses");
        
        let canSeeGhosts = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".can_see_ghosts") != 0;
        form.toggle("Can See Ghosts", { defaultValue: canSeeGhosts }); // 6
        form.label("If this custom role can see ghosts.");
        
        let abilityTypes = ["None", "Interact", "General", "Interact & General"];
        let abilityType = ScoreboardManager.getTrackedObjective("role_settings." + this.roleCustomData.roleID + ".ability_type");
        form.dropdown("Ability Type", abilityTypes, { defaultValueIndex: abilityType }); // 6
        form.label("How the ability works. §lNone§r disabled the ability. §lInteract§r makes this an interact ability. §lGeneral§r makes this an ability that can be used at any time.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }

            ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".cooldown_time", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".action_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".can_see_ghosts", r.formValues[8] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("role_settings." + this.roleCustomData.roleID + ".ability_type", r.formValues[10]);

            CustomRoleManager._saveToStand();

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let description = "";
        description += "\n\nConfig Name";
        return description;
        
    }
}

export class CustomRoleData {
    constructor(roleID, roleName, roleDescription, roleHelpDescription, roleAlignment, numericID) {
        this.roleID = roleID;
        this.roleName = roleName;
        this.roleDescription = roleDescription;
        this.roleHelpDescription = roleHelpDescription;
        this.roleAlignment = roleAlignment;
        this.alignmentID = CustomRoleData.alignmentToID(roleAlignment);
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Alignment id is " + this.alignmentID));
        this.numericID = numericID;
    }
    
    static alignmentToID(alignment) {
        return [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT, RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER].indexOf(alignment);
    }

    static alignmentIDToAlignment(id) {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Getting alignment with id " + id));
        if (id == -1) {
            return null;
        }
        return [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT, RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER][id];
    }
}