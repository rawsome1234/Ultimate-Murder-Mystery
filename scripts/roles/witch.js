"use strict";

import { world, system, Player, MolangVariableMap } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { RoleAlignment, RoleTypes } from "../role";
import { MurdererRole } from "./murderer";
import { ScoreboardManager } from "../scoreboard_manager";
import { DeathHandler } from "../death_handler";
import { SettingsHandler } from "../settings_handler";
import { ChatManager } from "../chat_manager";
import { InteractTypes, ParticleVisibilityType, PlayerHandler } from "../player_handler";
import { Util } from "../util";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";

export class WitchRole extends MurdererRole {

    static SPELL_LOCATION_PROPERTY = "spellLocation";
    static SPELL_DIMENSION_PROPERTY = "spellDimension";
    static SPELL_CORRUPT_TAG = "hitBySpell";

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        super.initialize();
        if (!PlayerHandler.onActionUse.isConnected(WitchRole.onAbilityUse)) {
            PlayerHandler.onActionUse.subscribe(WitchRole.onAbilityUse);
        }
        system.runInterval(WitchRole.spawnSpellParticles, 20);
    }

    static spawnSpellParticles() {
        if (!ScoreboardManager.isGameRunning()) {
            return;
        }
        if (world.getAllPlayers().length <= 0) {
            return;
        }
        let witches = PlayerHandler.sortPlayersWithRole(world.getAllPlayers(), RoleTypes.WITCH);
        let witchesWithSpells = witches.filter((witch) => !DeathHandler.consideredDead(witch) && witch.getDynamicProperty(WitchRole.SPELL_LOCATION_PROPERTY) != null);
        let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_radius");
        let playersCanSeeSpell = PlayerHandler.getPlayersThatSee(world.getAllPlayers(), ParticleVisibilityType.WITCH_SPELL_RADIUS);
        
        let murderersSeeSpell = ScoreboardManager.getTrackedObjective("role_settings.witch.murderers_see_spell") != 0;
        if (murderersSeeSpell) {
            let murderers = PlayerHandler.sortPlayersWithAlignment(world.getAllPlayers(), [RoleAlignment.MURDERER]);
            playersCanSeeSpell = playersCanSeeSpell.concat(murderers);
        }

        let particleSettings = new MolangVariableMap();
        particleSettings.setColorRGBA('variable.color', {red:0,blue:1,green:1,alpha:1});
        particleSettings.setFloat('variable.dust_lifetime', 1);
        
        witchesWithSpells.forEach((witch) => {
            let spellLocation = witch.getDynamicProperty(WitchRole.SPELL_LOCATION_PROPERTY);
            let spellDim = witch.getDynamicProperty(WitchRole.SPELL_DIMENSION_PROPERTY);
            let toShow = playersCanSeeSpell.concat([witch]);
            // spawn bomb particles
            let particleLocations = [PlayerHandler.addVectors(spellLocation, {x:0,y:.5,z:0})];
            for (let i = -spellRadius; i < spellRadius; i++) {
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:i,y:-spellRadius,z:spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:i,y:spellRadius,z:spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:i,y:-spellRadius,z:-spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:i,y:spellRadius,z:-spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:spellRadius,y:i,z:spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:-spellRadius,y:i,z:spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:spellRadius,y:i,z:-spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:-spellRadius,y:i,z:-spellRadius}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:spellRadius,y:spellRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:spellRadius,y:-spellRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:-spellRadius,y:spellRadius,z:i}));
                particleLocations.push(PlayerHandler.addVectors(spellLocation, {x:-spellRadius,y:-spellRadius,z:i}));
            }
            
            if (particleLocations.length > 0) {
                toShow.forEach((player) => {
                    if (player.dimension.id != spellDim) {
                        return;
                    }
                    particleLocations.forEach((loc) => player.spawnParticle("umm:line_draw", loc, particleSettings));
                });
            }
        });
    }

    /**
     * 
     * @param {OnActionUseSignal} onActionUse 
     */
    static onAbilityUse(onActionUse) {
        let player = onActionUse.actionUsePlayer;
        if (player.hasTag(WitchRole.SPELL_CORRUPT_TAG)) {
            player.removeTag(WitchRole.SPELL_CORRUPT_TAG);
            onActionUse.cancel = true;
            let spellForcedCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_forced_cooldown");
            let normalString = "Something went wrong! You're on cooldown again for " + spellForcedCooldown + " seconds.";
            player.sendMessage(normalString);
            SoundManager.playSoundEffect([player], SoundEffectType.BLOCK_ABILITY);
            ScoreboardManager.setPlayerActionCooldown(player, spellForcedCooldown);
        }
    }

    /**
     * Clears the witch spell corrupt tag from a player.
     * @param {Player} player 
     */
    static clearCorruptTag(player) {
        while (player.hasTag(WitchRole.SPELL_CORRUPT_TAG)) {
            player.removeTag(WitchRole.SPELL_CORRUPT_TAG);
        }
    }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     */
    giveToPlayer(player) {
        let actionUses = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_uses");
        let actionCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.action_charges", actionUses);
        ScoreboardManager.setPlayerActionCooldown(player, actionCooldown);
        player.setDynamicProperty(WitchRole.SPELL_LOCATION_PROPERTY, null);
        super.giveToPlayer(player);
    }

    /**
     * Gets the alignment of this role.
     * 
     * @param {Player} player the player who has the role
     * @returns {RoleAlignment}
     */
    getAlignment(player) {
        return RoleAlignment.MURDERER;
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§qWitch";
    }

    /**
     * The description for how this role works and what to do.
     * 
     * @returns {String}
     */
    getRoleDescription() {
        return "Place spells and activate them to prevent ability usage!";
    }

    /**
     * The help description on how this role works to be sent to players.
     * 
     * @returns {String}
     */
    getRoleHelpDescription() {
        return "When you place a spell, you'll have a second cooldown. After that cooldown, using your ability will activate the spell and all players caught in the radius will have their next ability cancelled.";
    }

    /**
     * Returns if this role is enabled or not, generally through scoreboard.
     * Returning true enables use for role guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("role_settings.witch.enabled") != 0;
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
        return RoleTypes.WITCH;
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
     * @param {Player} player 
     */
    activateAbility(player) {
        let spellLocation = player.getDynamicProperty(WitchRole.SPELL_LOCATION_PROPERTY);
        let chargesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.action_charges");

        if (chargesRemaining == 0) {
            player.sendMessage("Out of ability uses!");
            return;
        }

        if (spellLocation == null) {
            let currentLocation = player.location;
            let dimensionID = player.dimension.id;

            player.setDynamicProperty(WitchRole.SPELL_LOCATION_PROPERTY, currentLocation);
            player.setDynamicProperty(WitchRole.SPELL_DIMENSION_PROPERTY, dimensionID);
            SoundManager.playSoundEffect([player], SoundEffectType.WITCH_PLACE_SPELL);
            
            player.sendMessage("§qPlaced a spell at " + PlayerHandler.vecToString(currentLocation, 0));
            ChatManager.sendDeadPlayersMessage("§q§o" + player.name + " placed a spell at " + PlayerHandler.vecToString(currentLocation, 0), LogItemType.ABILITY_MESSAGE);

            let placementCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.after_placement_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, placementCooldown);
            return;
        }

        
        if (chargesRemaining != 0) {
            // activate ability 
            if (chargesRemaining > 0) {
                player.sendMessage("You have " + (chargesRemaining-1) + " actions remaining.");
                ScoreboardManager.addScoreboardObjective(player, "player.action_charges", -1);
            }
            
            // ability effect
            let spellDimension = player.getDynamicProperty(WitchRole.SPELL_DIMENSION_PROPERTY);
            let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_radius");
            player.setDynamicProperty(WitchRole.SPELL_LOCATION_PROPERTY, null);
            
            let playersInRadius = Util.getPlayersInRadius(PlayerHandler.getLivingPlayers(world.getAllPlayers()), spellLocation, spellRadius, spellDimension);
            // world.getAllPlayers().forEach((pl) => pl.sendMessage(playersInRadius.length + " players in radius"));
            let beforeInteract = PlayerHandler.beforePlayerInteract;
            playersInRadius = playersInRadius.filter((pl) => {
                beforeInteract.resetSignal();
                beforeInteract.interactType = InteractTypes.WITCH_SPELL;
                beforeInteract.emitInteract(player, pl);
                if (beforeInteract.cancel) {
                    ChatManager.sendDeadPlayersMessage("§q§o" + pl.name + " avoided " + player.name + "'s spell.", LogItemType.ABILITY_MESSAGE);
                    return false;
                }
                pl.addTag(WitchRole.SPELL_CORRUPT_TAG);
                return true;
            });
            SoundManager.playSoundEffect([player], SoundEffectType.WITCH_USE_SPELL);

            // ability activate message
            player.sendMessage("§qYour spell caught " + playersInRadius.length + " players!");
            ChatManager.sendDeadPlayersMessage("§q§o" + player.name + " used their spell at " + PlayerHandler.vecToString(spellLocation, 0) + " and hit " + Util.formatStringList(playersInRadius.map((pl) => pl.name), ", ", true) + " players!", LogItemType.ABILITY_MESSAGE);
            
            playersInRadius.forEach((pl) => {
                PlayerHandler.afterPlayerInteract.emitInteract(player, pl, InteractTypes.WITCH_SPELL);
            });
            // sets cooldown
            let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_cooldown");
            ScoreboardManager.setPlayerActionCooldown(player, cooldownTime);
        }
    }

    /**
     * Activates the ability of this role for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
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
        form.title("Witch Settings");

        form.divider();
        form.label("The witch is a murderer role that can place a spell on the ground and later activate it to reset all cooldowns in a radius.");

        let roleEnabled = ScoreboardManager.getTrackedObjective("role_settings.witch.enabled") != 0;
        form.toggle("Witch Enabled", { defaultValue: roleEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_cooldown");
        form.slider("Spell Cooldown", SettingsHandler.powerAbilityCooldownMin, SettingsHandler.powerAbilityCooldownMax, { valueStep: SettingsHandler.powerAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of spell. The initial cooldown and the cooldown after activating a spell.");
        
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_uses");
        form.slider("Spell Ability Uses", -1, 10, { defaultValue: abilityUses }); // 6
        form.label("The number of times spell can be used. -1 is infinite uses");
        
        let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_radius");
        form.slider("Spell Radius", 1, 20, { defaultValue: spellRadius }); // 8
        form.label("The radius of the spell. Goes through walls");
        
        let afterPlacementCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.after_placement_cooldown");
        form.slider("After Placement Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: afterPlacementCooldown }); // 6
        form.label("After placing the spell, this will be the cooldown before the Witch can activate the spell.");
        
        let spellForcedCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_forced_cooldown");
        form.slider("Override Cooldown", 30, 180, { defaultValue: spellForcedCooldown, valueStep: 5 }); // 12
        form.label("The cooldown that players are forced to have if caught in the spell. Will cancel their next ability usage.");
        
        let murderersSeeSpell = ScoreboardManager.getTrackedObjective("role_settings.witch.murderers_see_spell") != 0;
        form.toggle("Murderers See Spell", { defaultValue: murderersSeeSpell }); // 14
        form.label("If true, fellow murderers will see the spell outline.");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("role_settings.witch.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !roleEnabled) {
                ScoreboardManager.setRoleAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("role_settings.witch.spell_cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("role_settings.witch.spell_uses", r.formValues[6]);
            ScoreboardManager.setTrackedObjective("role_settings.witch.spell_radius", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("role_settings.witch.after_placement_cooldown", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("role_settings.witch.spell_forced_cooldown", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("role_settings.witch.murderers_see_spell", r.formValues[14] ? 1 : 0);

            callback(player);
        });
    }

    /**
     * Gets the role information for this role.
     * @returns {String} a full description of this role and its current config. Does not include name.
     */
    getRoleInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_cooldown");
        let abilityUses = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_uses");
        let spellRadius = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_radius");
        let afterPlacementCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.after_placement_cooldown");
        let spellForcedCooldown = ScoreboardManager.getTrackedObjective("role_settings.witch.spell_forced_cooldown");
        let murderersSeeSpell = ScoreboardManager.getTrackedObjective("role_settings.witch.murderers_see_spell") != 0;
        
        let description = "The Witch is a murderer role that can cast a spell and later unleash that spell to cause all players in a radius of the spell to have their next ability cancelled (like a C4).";
        description += "\n\nSpell Cooldown: " + cooldownTime + " seconds.";
        description += "\nSpell Uses: " + abilityUses;
        description += "\nSpell Radius: " + spellRadius;
        description += "\nCooldown After Placing Spell: " + afterPlacementCooldown + " seconds.";
        description += "\nCooldown on Ability Cancel: " + spellForcedCooldown + " seconds.";
        description += "\nMurderers See Spell Outline: " + murderersSeeSpell;
        return description;
    }
}