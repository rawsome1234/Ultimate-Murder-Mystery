"use strict";

import { world, system, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { Modifier, ModifierAlignment, ModifierTypes } from "../modifier";
import { RoleAlignment } from "../role";
import { ScoreboardManager } from "../scoreboard_manager";
import { SettingsHandler } from "../settings_handler";
import { Util } from "../util";
import { GuessingManager } from "../guessing_manager";
import { MedicRole } from "../roles/medic";
import { PlayerHandler } from "../player_handler";
import { TransporterRole } from "../roles/transporter";
import { RoleManager } from "../role_manager";
import { ChatManager } from "../chat_manager";
import { LogItemType } from "../logs/game_log";
import { SoundEffectType, SoundManager } from "../sound_manager";
import { DeathHandler } from "../death_handler";
// import { MurdererRole } from "../roles/murderer";

export class GamblerModifier extends Modifier {

    static INNOCENT_REVEALED_PLAYERS_PROPERTY = "revealedPlayerIDs";

    static NUMBER_CHANCES = [
        {number: 1, weight: 1, effect: null }
    ]

    /**
     * Initializes this role. Meant for connecting to signals.
     */
    initialize() {
        GamblerModifier.NUMBER_CHANCES = [
            {number: 1, weight: 3, effect: GamblerResults.WITHER },
            {number: 2, weight: 4, effect: GamblerResults.RECEIVE_DOUBLE_DAMAGE },
            {number: 3, weight: 5, effect: GamblerResults.GAIN_SLOWNESS },
            {number: 4, weight: 5, effect: GamblerResults.GAIN_WEAKNESS },
            {number: 5, weight: 5, effect: GamblerResults.HALF_HEALTH },
            {number: 6, weight: 5, effect: GamblerResults.GAIN_NAUSEA },
            {number: 7, weight: 5, effect: GamblerResults.FREEZE_IN_PLACE },
            {number: 8, weight: 5, effect: GamblerResults.LOW_DAMAGE },
            {number: 9, weight: 5, effect: GamblerResults.BLOCK_INTERACTION },
            {number: 10, weight: 5, effect: GamblerResults.ABOUT_FACE },
            {number: 11, weight: 5, effect: GamblerResults.ABSORPTION_HEARTS },
            {number: 12, weight: 5, effect: GamblerResults.SHORTEN_COOLDOWN },
            {number: 13, weight: 5, effect: GamblerResults.RANDOM_TRANSPORT },
            {number: 14, weight: 5, effect: GamblerResults.GAIN_RESISTANCE },
            {number: 15, weight: 5, effect: GamblerResults.GAIN_STRENGTH },
            {number: 16, weight: 5, effect: GamblerResults.FULL_HEAL },
            {number: 17, weight: 5, effect: GamblerResults.SUPER_ARMOR },
            {number: 18, weight: 5, effect: GamblerResults.DEAL_DOUBLE_DAMAGE },
            {number: 19, weight: 4, effect: GamblerResults.GIVE_MEDIC },
            {number: 20, weight: 3, effect: GamblerResults.SUPER_EFFECT },
        ];
        // if (!SignalOwner.signalName.isConnected(this.signalReceiver)) {
        //     SignalOwner.signalName.subscribe(this.signalReceiver);
        // }
        super.initialize();
    }

    // static signalReceiver(params) {

    // }

    /**
     * Gives this role to the player.
     * For unique effects. ID assigning and basic ability items
     * are automatically handled separately.
     * @param {Player} player 
     */
    giveToPlayer(player) {
        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", cooldown * 20);
        player.setDynamicProperty(GamblerModifier.INNOCENT_REVEALED_PLAYERS_PROPERTY, "[]");
        super.giveToPlayer(player);
    }

    /**
     * Gets the valid alignments this modifier can be applied to.
     * 
     * @returns {ModifierAlignment}
     */
    getModifierAlignment() {
        return ModifierAlignment.ALL;
    }

    /**
     * Gets the valid role types this modifier can be applied to.
     * 
     * @returns {RoleTypes[]}
     */
    getWhitelistedRoles() {
        return [];
    }

    /**
     * A list of role types that this modifier cannot apply to.
     * @returns {RoleTypes[]}
     */
    getBlacklistedRoles() {
        return [];
    }

    /**
     * Gets the display name for use in messages and printing.
     * 
     * @returns {String}
     */
    getDisplayName() {
        return "§gGambler";
    }

    /**
     * The description for how this modifier works and what to do.
     * 
     * @returns {String}
     */
    getModifierDescription() {
        return "Roll the dice for various effects!";
    }

    /**
     * The help description on how this modifier works to be sent to players.
     * 
     * @returns {String}
     */
    getModifierHelpDescription() {
        return "";
    }

    /**
     * Returns if this modifier is enabled or not, generally through scoreboard.
     * Returning true enables use for modifier guessing and in game.
     * 
     * @returns {boolean}
     */
    isEnabled() {
        return ScoreboardManager.getTrackedObjective("modifier_settings.gambler.enabled") != 0;
    }

    /**
     * Returns if this modifier can see ghost bodies.
     */
    canSeeGhosts() {
        return false;
    }

    /**
     * Returns if the player can use this role ability.
     * 
     * @returns {boolean}
     */
    hasAbility(player) {
        return true;
    }

    /**
     * Returns the type identifier for this modifier.
     * 
     * @returns {ModifierTypes}
     */
    getModifierType() {
        return ModifierTypes.GAMBLER;
    }

    /**
     * Called when the guesser calls the guessedPlayer as this role.
     * 
     * @param {Player} guesser the player who guessed the other player.
     * @param {Player} guessedPlayer the player who was guessed. Presumably has this modifier.
     * @returns {boolean} whether to cancel the guess kill or not.
     */
    onGuess(guesser, guessedPlayer) {
        return false;
    }

    /**
     * Whether this modifier can be guessed or not.
     */
    canBeGuessed() {
        return true;
    }

    /**
     * Returns a random number with an effect and number.
     * @returns {Object}
     */
    static rollRandomNumber() {
        let evenDiceRolls = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.even_dice_rolls") != 0;
        if (evenDiceRolls) {
            return GamblerModifier.NUMBER_CHANCES[ScoreboardManager.rollRandomNumber(0, GamblerModifier.NUMBER_CHANCES.length)];
        }
        let allWeights = GamblerModifier.NUMBER_CHANCES.map((n) => n.weight);
        let rolledNumberIndex = Util.rollWeights(allWeights);
        let numberRolled = GamblerModifier.NUMBER_CHANCES[rolledNumberIndex];
        return numberRolled;
    }

    /**
     * Activates a gambler's effect on a player
     * @param {Player} player presumably has gambler
     * @param {GamblerResults} effect 
     */
    static activateEffect(player, effect) {
        let playerHealthComp = player.getComponent("minecraft:health");
        let currentHealth = playerHealthComp.currentValue;
        let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.strength_duration");
        switch (effect) {
            case GamblerResults.WITHER:
                GuessingManager.killGuessedPlayer(player);
                break;
            case GamblerResults.RECEIVE_DOUBLE_DAMAGE:
                let receiveDamageTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.receive_double_damage_time");
                ScoreboardManager.setScoreboardObjective(player, PlayerHandler.RECEIVE_DOUBLE_DAMAGE_SCOREBOARD, receiveDamageTime * 20);
                break;
            case GamblerResults.FREEZE_IN_PLACE:
                let freezeTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.freeze_duration");
                player.sendMessage("§bYou've been frozen!");
                ScoreboardManager.setScoreboardObjective(player, "role_settings.cryomancer.freeze_timer", freezeTime * 20);
                SoundManager.playSoundEffect([player], SoundEffectType.CRYOMANCER_FREEZE);
                break;
            case GamblerResults.HALF_HEALTH:
                let newHealth = Math.ceil(currentHealth / 2);
                player.applyDamage(currentHealth - newHealth);
                // playerHealthComp.setCurrentValue(newHealth);
                break;
            case GamblerResults.LOW_DAMAGE:
                let lowDamageAmount = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.low_damage_amount");
                let damageCanKill = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.low_damage_can_kill");
                let damageToDeal = lowDamageAmount;
                if (!damageCanKill && currentHealth - lowDamageAmount <= 0) {
                    damageToDeal = currentHealth - 1;
                }
                player.applyDamage(damageToDeal);
                break;
            case GamblerResults.BLOCK_INTERACTION:
                let blockInteractionDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.block_interaction_duration");
                PlayerHandler.startBlockInteractTime(player, blockInteractionDuration);
                break;
            case GamblerResults.ABOUT_FACE:
                let playerRotation = player.getRotation();
                let currentRotation = playerRotation.y;
                currentRotation = ((currentRotation - 180));
                player.teleport(player.location, {rotation: {x: playerRotation.x, y:currentRotation}});
                break;
            case GamblerResults.ABSORPTION_HEARTS:
                let absorptionAmp = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.absorption_level");
                player.addEffect("minecraft:absorption", 20000000, {amplifier: absorptionAmp, showParticles: false});
                break;
            case GamblerResults.SHORTEN_COOLDOWN:
                let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.ability_cooldown_reduction") / 100;
                let currentPlayerMultiplier = ScoreboardManager.getScoreboardObjective(player, "player.cooldown_multiplier") / 100;
                ScoreboardManager.setScoreboardObjective(player, "player.cooldown_multiplier", (currentPlayerMultiplier * cooldownReduction) * 100);
                break;
            case GamblerResults.RANDOM_TRANSPORT:
                let players = TransporterRole.getTeleportablePlayers(world.getAllPlayers(), true);
                if (players.length <= 1) {
                    player.sendMessage("§g§oNot enough players alive to transport.");
                    return;
                }
                let playerOneIndex = ScoreboardManager.rollRandomNumber(0, players.length);
                let randomPlayerOne = players[playerOneIndex];
                // player.sendMessage("Player one: " + randomPlayerOne.name);
                players.splice(playerOneIndex, 1);
                let randomPlayerTwo = players[ScoreboardManager.rollRandomNumber(0, players.length)];
                TransporterRole.attemptTransport(player, randomPlayerOne, randomPlayerTwo, false, false);
                break;
            case GamblerResults.GAIN_SLOWNESS:
                let slownessDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.slowness_duration");
                player.addEffect("minecraft:slowness", slownessDuration * 20, { showParticles: false });
                break;
            case GamblerResults.GAIN_WEAKNESS:
                let weaknessDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.weakness_duration");
                player.addEffect("minecraft:weakness", weaknessDuration * 20, { showParticles: false });
                break;
            case GamblerResults.GAIN_NAUSEA:
                let nauseaDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.nausea_duration");
                player.addEffect("minecraft:nausea", nauseaDuration * 20, { showParticles: false });
                break;
            case GamblerResults.GAIN_RESISTANCE:
                let resistanceDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.resistance_duration");
                player.addEffect("minecraft:resistance", resistanceDuration * 20, { showParticles: false });
                break;
            case GamblerResults.GAIN_STRENGTH:
                player.addEffect("minecraft:strength", strengthDuration * 20, { showParticles: false });
                break;
            case GamblerResults.FULL_HEAL:
                playerHealthComp.resetToMaxValue();
                break;
            case GamblerResults.SUPER_ARMOR:
                // let currentSuperArmor = ScoreboardManager.getScoreboardObjective(player, PlayerHandler.SUPER_ARMOR_USES_SCOREBOARD);
                ScoreboardManager.addScoreboardObjective(player, PlayerHandler.SUPER_ARMOR_USES_SCOREBOARD, 1);
                break;
            case GamblerResults.DEAL_DOUBLE_DAMAGE:
                ScoreboardManager.addScoreboardObjective(player, PlayerHandler.DEAL_DOUBLE_DAMAGE_USES_SCOREBOARD, 1);
                break;
            case GamblerResults.GIVE_MEDIC:
                let playerID = ScoreboardManager.getPlayerID(player);
                player.addTag(MedicRole.medicMarkTag + playerID);
                break;
            case GamblerResults.REVEAL_INNOCENT:
                // TEST
                // gets innocents
                let livingPlayers = PlayerHandler.getLivingPlayers(world.getAllPlayers());
                let innocentPlayers = PlayerHandler.sortPlayersWithAlignment(livingPlayers, [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT]);
                
                // sorts by if they've already been revealed
                let alreadyRevealedIDs = JSON.parse(player.getDynamicProperty(GamblerModifier.INNOCENT_REVEALED_PLAYERS_PROPERTY));
                innocentPlayers = innocentPlayers.filter((pl) => pl.id != player.id && !alreadyRevealedIDs.includes(ScoreboardManager.getPlayerID(pl)));
                
                if (innocentPlayers.length == 0) {
                    player.sendMessage("§g§oThere are no innocent players remaining. You've been given medic and healed.");
                    let playerID = ScoreboardManager.getPlayerID(player);
                    player.addTag(MedicRole.medicMarkTag + playerID);
                    playerHealthComp.resetToMaxValue();
                    break;
                }

                // picks a random player and messages
                let randomPlayer = innocentPlayers[ScoreboardManager.rollRandomNumber(0, innocentPlayers.length)];
                player.sendMessage("§g" + randomPlayer.name + " is an innocent...");
                // adds them to the list
                alreadyRevealedIDs.push(ScoreboardManager.getPlayerID(randomPlayer));
                player.setDynamicProperty(GamblerModifier.INNOCENT_REVEALED_PLAYERS_PROPERTY, JSON.stringify(alreadyRevealedIDs));
                break;
            case GamblerResults.SUPER_POWER_KILLER:
                if (ScoreboardManager.getTrackedObjective("settings.role_guessing.enabled") != 0) {
                    ScoreboardManager.addScoreboardObjective(player, "player.safe_guesses", 1);
                    let safeGuesses = ScoreboardManager.getScoreboardObjective(player, "player.safe_guesses");
                    let guessesRemaining = ScoreboardManager.getScoreboardObjective(player, "player.guesses");
                    if (guessesRemaining != -1 && guessesRemaining < safeGuesses) {
                        ScoreboardManager.setScoreboardObjective(player, "player.guesses", safeGuesses);
                    }
                    player.sendMessage("§g§oYou've been granted a safe guess...");
                }

                player.addEffect("minecraft:strength", Math.max(strengthDuration, 30) * 20, { showParticles: false, amplifier: 1 });
                player.addEffect("minecraft:absorption", 60*20, {showParticles: false, amplifier: 4});
                playerHealthComp.resetToMaxValue();
                player.sendMessage("§g§oYou've been fully healed and given strength.");

                break;
            default:
                break;
        }
    }

    /**
     * Activates the ability of this modifier for the given player. Assumes
     * the player has this modifier.
     * @param {Player} player 
     */
    activateAbility(player) {
        let randomNumber = GamblerModifier.rollRandomNumber();

        let effect =  randomNumber.effect; 
        let number = randomNumber.number;

        if (effect == GamblerResults.SUPER_EFFECT) {
            let playerRole = RoleManager.getPlayerRole(player);
            if (playerRole == null || !playerRole.getAlignment().is_killer) {
                effect = GamblerResults.REVEAL_INNOCENT;
            }
            else {
                effect = GamblerResults.SUPER_POWER_KILLER;
            }
        }

        SoundManager.playSoundEffect([player], SoundEffectType.GAMBLER_ROLL);
        player.sendMessage("§g§oRolling dice....");
        system.runTimeout(() => {
            if (DeathHandler.consideredDead(player)) {
                return;
            }
            GamblerModifier.activateEffect(player, effect);
            player.sendMessage("§g§oRolled a §l" + number + "§r§g§o, " + effect.display + ".");
            ChatManager.sendDeadPlayersMessage("§g§o" + player.name + " rolled a §l" + number + "§r§g§o, " + effect.dead_display + ".", LogItemType.ABILITY_MESSAGE);
        }, 18);


        let cooldown = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.cooldown");
        ScoreboardManager.setScoreboardObjective(player, "player.modifier_cooldown", cooldown * 20);
    }

    /**
     * Activates the ability of this modifier for the inputted player,
     * assuming the target entity was clicked.
     * @param {Player} player the player who is clicking.
     * @param {Entity} otherEntity the entity the player clicked.
     */
    activateAbilityOnEntity(player, otherEntity) {
    }

    /**
     * Returns if this modifier has met its win condition.
     * If this is true, the player will win, even if they did not win by their role.
     * @param {Player} player
     * @param {RoleAlignment} winningAlignment 
     * @returns {boolean}
     */
    meetsWinCondition(player, winningAlignment) {
        return false;
    }

    /**
     * Creates the config for this modifier and shows it to the requested player.
     * 
     * @param {Player} player is the player to show the form to
     * @param callback the callback menu to call after the player submits the menu
     */
    createConfig(player, callback) {
        let form = new ModalFormData();
        form.title("Gambler Settings");

        form.divider();
        form.label("Gambler is a universal modifier that lets the player roll a dice that gives a random outcome.\nThis modifier uses effects of roles such as transporter and medic, regardless if those are enabled.");

        let modifierEnabled = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.enabled") != 0;
        form.toggle("Gambler Enabled", { defaultValue: modifierEnabled }); // 2

        form.divider();

        // 4
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.cooldown");
        form.slider("Gambler Cooldown", SettingsHandler.basicAbilityCooldownMin, SettingsHandler.basicAbilityCooldownMax, { valueStep: SettingsHandler.basicAbilityCooldownInterval, defaultValue: cooldownTime })
        form.label("The ability cooldown of gambler. Resets every use.");
        
        let evenDiceRolls = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.even_dice_rolls") != 0;
        form.toggle("Even Dice Rolls", { defaultValue: evenDiceRolls }); // 6
        form.label("By default, the dice rolls are slightly weighted against #1 and #20. If this is true, every number has an even chance to be rolled.");
        
        let receiveDamageTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.receive_double_damage_time");
        form.slider("Receive Double Damage Duration", 10, 60, { valueStep: 5, defaultValue: receiveDamageTime }); // 8
        form.label("The amount of time in seconds the double damage effect will last.");
        
        let freezeTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.freeze_duration");
        form.slider("Freeze Duration", 3, 15, { defaultValue: freezeTime }); // 10
        form.label("The amount of time in seconds the freeze effect will last.");
        
        let lowDamageAmount = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.low_damage_amount");
        form.slider("Low Damage Amount", 1, 20, { defaultValue: lowDamageAmount }); // 12
        form.label("The damage dealt if rolling a number that deals a low amount of damage, in half-hearts.");
        
        let damageCanKill = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.low_damage_can_kill") != 0;
        form.toggle("Low Damage Can Kill", { defaultValue: damageCanKill }); // 14
        form.label("If true, the low damage effect can kill.");
        
        let blockInteractionDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.block_interaction_duration");
        form.slider("Block Interaction Time", 5, 90, { valueStep: 5, defaultValue: blockInteractionDuration }); // 16
        form.label("The amount of time the block interaction effect lasts, in seconds.");
        
        let absorptionAmp = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.absorption_level");
        form.slider("Absorption Amplifier", 0, 4, { defaultValue: absorptionAmp }); // 18
        form.label("The amplifier of the absorption gained if the absorption effect is rolled.");
        
        let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.ability_cooldown_reduction");
        form.slider("Cooldown Reduction", 5, 100, { valueStep: 5, defaultValue: cooldownReduction }); // 20
        form.label("The percent reduction in cooldown granted by the reduce cooldown effect, in percent.");
        
        let weaknessDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.weakness_duration");
        form.slider("Weakness Duration", 5, 90, { valueStep: 5, defaultValue: weaknessDuration }); // 22
        form.label("The duration of the weakness effect when rolled.");
        
        let slownessDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.slowness_duration");
        form.slider("Slowness Duration", 5, 90, { valueStep: 5, defaultValue: slownessDuration }); // 24
        form.label("The duration of the slowness effect when rolled.");
        
        let nauseaDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.nausea_duration");
        form.slider("Nausea Duration", 5, 90, { valueStep: 5, defaultValue: nauseaDuration }); // 26
        form.label("The duration of the nausea effect when rolled.");
        
        let resistanceDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.resistance_duration");
        form.slider("Resistance Duration", 5, 90, { valueStep: 5, defaultValue: resistanceDuration }); // 28
        form.label("The duration of the resistance effect when rolled.");
        
        let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.strength_duration");
        form.slider("Strength Duration", 5, 90, { valueStep: 5, defaultValue: strengthDuration }); // 30
        form.label("The duration of the strength effect when rolled.");
        
        let revealMinPlayers = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.reveal_innocent_min_players");
        form.slider("Reveal Innocent Min Players", 2, world.getAllPlayers().length, { defaultValue: revealMinPlayers }); // 32
        form.label("The minimum number of other players that must be alive to roll the reveal innocent effect.");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.enabled", r.formValues[2] ? 1 : 0);
            if (r.formValues[2] && !modifierEnabled) {
                ScoreboardManager.setModifierAsEnabled(this);
            }
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.cooldown", r.formValues[4]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.even_dice_rolls", r.formValues[6] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.receive_double_damage_time", r.formValues[8]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.freeze_duration", r.formValues[10]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.low_damage_amount", r.formValues[12]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.low_damage_can_kill", r.formValues[14] ? 1 : 0);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.block_interaction_duration", r.formValues[16]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.absorption_level", r.formValues[18]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.ability_cooldown_reduction", r.formValues[20]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.weakness_duration", r.formValues[22]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.slowness_duration", r.formValues[24]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.nausea_duration", r.formValues[26]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.resistance_duration", r.formValues[28]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.strength_duration", r.formValues[30]);
            ScoreboardManager.setTrackedObjective("modifier_settings.gambler.reveal_innocent_min_players", r.formValues[32]);

            callback(player);
        });
    }

    /**
     * Gets the modifier information for this modifier.
     * @returns {String} the full description of this modifier and its settings.
     */
    getModifierInformation() {
        let cooldownTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.cooldown");
        let evenDiceRolls = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.even_dice_rolls") != 0;
        let receiveDamageTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.receive_double_damage_time");
        let freezeTime = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.freeze_duration");
        let lowDamageAmount = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.low_damage_amount");
        let damageCanKill = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.low_damage_can_kill") != 0;
        let blockInteractionDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.block_interaction_duration");
        let absorptionAmp = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.absorption_level");
        let cooldownReduction = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.ability_cooldown_reduction");
        let weaknessDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.weakness_duration");
        let slownessDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.slowness_duration");
        let nauseaDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.nausea_duration");
        let resistanceDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.resistance_duration");
        let strengthDuration = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.strength_duration");
        let revealMinPlayers = ScoreboardManager.getTrackedObjective("modifier_settings.gambler.reveal_innocent_min_players");

        let description = "Gambler is a modifier that lets the player roll a d20 for various effects.";
        description += "\n\nCooldown: " + cooldownTime + " seconds.";
        description += "\nEvent Dice Rolls: " + evenDiceRolls;
        description += "\nReceive Double Damage Time: " + receiveDamageTime + " seconds.";
        description += "\nFreeze Time: " + freezeTime + " seconds.";
        description += "\nLow Damage Amount: " + (lowDamageAmount / 2) + " hearts.";
        description += "\nLow Damage Kills: " + damageCanKill;
        description += "\nBlock Interaction Time: " + blockInteractionDuration + " seconds.";
        description += "\nAbsorption Amplifier: " + absorptionAmp;
        description += "\nCooldown Reduction: " + cooldownReduction;
        description += "\nWeakness Duration: " + weaknessDuration + " seconds.";
        description += "\nSlowness Duration: " + slownessDuration + " seconds.";
        description += "\nNausea Duration: " + nauseaDuration + " seconds.";
        description += "\nResistance Duration: " + resistanceDuration + " seconds.";
        description += "\nStrength Duration: " + strengthDuration + " seconds.";
        description += "\nMin Players for Reveal: " + revealMinPlayers;
        return description;
    }
}

export const GamblerResults = Object.freeze({
    WITHER: { id: 0, display: "causing you to get withered", dead_display: "causing them to get withered" }, 
    HALF_HEALTH: { id: 1, display: "taking half your health", dead_display: "taking half their health" }, 
    LOW_DAMAGE: { id: 2, display: "dealing a small amount of damage", dead_display: "dealing a small amount of damage" }, 
    BLOCK_INTERACTION: { id: 3, display: "blocking interactions for a short time", dead_display: "blocking interactions for a short time" }, 
    ABSORPTION_HEARTS: { id: 4, display: "granting absorption", dead_display: "granting them absorption" }, 
    RANDOM_TRANSPORT: { id: 5, display: "causing a warp", dead_display: "causing a warp" }, 
    GAIN_RESISTANCE: { id: 6, display: "granting resistance", dead_display: "granting them resistance" }, 
    GAIN_STRENGTH: { id: 7, display: "granting strength", dead_display: "granting them strength" }, 
    FULL_HEAL: { id: 8, display: "fully healing you", dead_display: "fully healing them" }, 
    GIVE_MEDIC: { id: 9, display: "granting you medic status", dead_display: "granting them medic status" }, 
    REVEAL_INNOCENT: { id: 10, display: "revealing an innocent player", dead_display: "revealing an innocent player" }, 
    SUPER_EFFECT: { id: 11, display: "this should never be seen", dead_display: "this should never be seen" }, 
    SUPER_POWER_KILLER: { id: 12, display: "boosting you immensely", dead_display: "boosting them immensely" }, 
    RECEIVE_DOUBLE_DAMAGE: { id: 13, display: "making you receive double damage for a short time", dead_display: "making them take double damage" }, 
    GAIN_SLOWNESS: { id: 14, display: "giving slowness", dead_display: "giving them slowness" }, 
    GAIN_WEAKNESS: { id: 15, display: "giving weakness", dead_display: "giving them weakness" }, 
    GAIN_NAUSEA: { id: 16, display: "giving nausea", dead_display: "giving them nausea" }, 
    FREEZE_IN_PLACE: { id: 17, display: "freezing you in place", dead_display: "freezing them in place" }, 
    ABOUT_FACE: { id: 18, display: "flipping you 180", dead_display: "rotating them about face" }, 
    SHORTEN_COOLDOWN: { id: 19, display: "reducing your next cooldown", dead_display: "reducing their next cooldown" }, 
    SUPER_ARMOR: { id: 20, display: "giving you an additional use of Super Armor (blocks next hit over 1 heart)", dead_display: "giving them an additional use of super armor" }, 
    DEAL_DOUBLE_DAMAGE: { id: 21, display: "granting you a double damage hit (on hits that deal more than 1 heart)", dead_display: "granting them a double damage hit" }, 
});