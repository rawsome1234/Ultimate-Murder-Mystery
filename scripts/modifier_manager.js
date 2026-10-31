"use strict";

import { world, system } from "@minecraft/server";

import { Modifier } from "./modifier";
import { ScoreboardManager } from "./scoreboard_manager";
import { Util } from "./util";
import { CategoriesEnabled } from "./current_modifiers/modifiers_enabled";
// importing all the roles :skull:

export class ModifierManager {
    /**
     * @type {Modifier[]}
    */
    static allModifiers = [];
    static _allModifiersSorted = [];
    // static murdererRoles = [];
    // static innocentRoles = [];
    // static neutralKRoles = [];
    // static neutralIRoles = [];
    static modifierList = new Map();

    static initialize() {
        ModifierManager.getModifiers().forEach((mod) => {
            ScoreboardManager.createScoreboardObjective("modifier_settings." + mod.getModifierType().name + ".mod_count");
            let createdWeight = ScoreboardManager.createScoreboardObjective("modifier_settings." + mod.getModifierType().name + ".weight");
            if (createdWeight) {
                ScoreboardManager.setTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight", 50);
            }
        });
    }

    static _getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag("AFK")) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Returns a list of players who do not have any modifiers.
     * @param {Player[]} players
     */
    static getPlayersWithoutModifier(players) {
        let validPlayers = [];
        players.forEach((pl) => {
            if (ModifierManager.getPlayerModifier(pl) == null) {
                validPlayers.push(pl);
            }
        });
        return validPlayers
    } 

    /**
     * Returns the matching modifier with the inputted modifier ID.
     * 
     * @return {Modifier} the modifier associated with the modifier type, or null if not found.
     */
    static getMatchingModifier(modifierID) {
        let modifiers = this.getModifiers(true);
        
        let modifierIndex = -1;
        let min = 0; // min index
        let max = modifiers.length; // max index
        let smallestID = modifiers[min].getModifierType().id
        let largestID = modifiers[max-1].getModifierType().id
        let validID = modifierID <= largestID && modifierID >= smallestID;
        let halfway = modifierID < max && modifierID >= min && validID ? modifierID : Math.floor((max - min) / 2) + min;
        while (max >= min && validID && halfway < modifiers.length) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Checking role index " + halfway + " (" + min + "-" + max + ")"));
            let modToCheck = modifiers[halfway];
            let modID = modToCheck.getModifierType().id;
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Role ids: " + roleID + " (" + roleCustomID + ")"));
            if (modID == modifierID) {
                modifierIndex = halfway;
                break;
            }
            if (modID > modifierID) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Incrementing max to " + (halfway-1)));
                max = halfway - 1;
            }
            if (modID < modifierID) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Incrementing min to " + (halfway+1)));
                min = halfway + 1;
            }
            
            halfway = Math.floor((max - min) / 2) + min;
        }
        
        if (modifierIndex == -1) {
            world.sendMessage("Modifier of index " + modifierID + " not found");
            return null;
        }

        return modifiers[modifierIndex];
    }

    /**
     * Returns the role of the inputted entity.
     * 
     * @return {Modifier}
     */
    static getPlayerModifier(entity) {
        let modifierValue = ScoreboardManager.getScoreboardObjective(entity, "player.modifier_id");
        if (modifierValue == -1) {
            return null;
        }
        let modifier = ModifierManager.getMatchingModifier(modifierValue);
        return modifier;
    }

    /**
     * Returns a list of modifiers that will be used for the next game.
     * 
     * @returns {Modifier[]} a list of random modifiers that will be used.
     */
    static getRandomModifiers() {
        let selectedModifiers = [];

        let enabledModifiers = this.getEnabledModifiers();
        let possibleModifiers = [];
        if (enabledModifiers.length) {
            enabledModifiers.forEach((mod) => {
                let modCount = ScoreboardManager.getTrackedObjective("modifier_settings." + mod.getModifierType().name + ".mod_count");
                while (modCount > 0) {
                    possibleModifiers.push(mod);
                    modCount--;
                }
            });
        }

        return possibleModifiers;
    }

    /**
     * Returns the index of the modifier to apply to the role.
     * @param {Modifier[]} modList 
     * @param {Role} roleToApply
     */
    static getRandomModifierForRole(modList, roleToApply) {
        let validList = modList.filter((mod) => mod.canApplyToRole(roleToApply));
        let modIndexes = [...Array(modList.length).keys()];
        modIndexes = modIndexes.filter((index) => modList[index].canApplyToRole(roleToApply));
        if (modIndexes.length <= 0) {
            return -1;
        }
        let indexToGive = Util.rollWeights(validList.map((mod) => ScoreboardManager.getTrackedObjective("modifier_settings." + mod.getModifierType().name + ".weight")));
        if (indexToGive < 0) {
            indexToGive = ScoreboardManager.rollRandomNumber(0, modIndexes.length);
            world.sendMessage("Index was negative, rolling random " + indexToGive);
        }
        return modIndexes[indexToGive];
    }

    /**
     * Gets a list of role alignments to be used in the game.
     * 
     * @returns {Object}
     */
    static getRoleCounts() {
        let playerCount = this._getPlayingPlayers(world.getAllPlayers()).length;
        let murdererCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.murderer_count.min"), ScoreboardManager.getTrackedObjective("assignment.murderer_count.max") + 1);
        if (murdererCount > playerCount) {
            world.sendMessage("Not enough players for " + murdererCount + " murderers.");
            return;
        }
        if (ScoreboardManager.getTrackedObjective("settings.book_pass.enabled") == 1) {
            murdererCount = 1;
        }

        let randomMurdererCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.random_murderers.min"), ScoreboardManager.getTrackedObjective("assignment.random_murderers.max") + 1);
        if (randomMurdererCount > murdererCount) {
            randomMurdererCount = murdererCount;
        }
        let randomNeutralKillerCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.min"), ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.max") + 1);
        let randomNeutralInnocentCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.min"), ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.max") + 1);
        let randomInnocentCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.random_innocents.min"), ScoreboardManager.getTrackedObjective("assignment.random_innocents.max") + 1);
        let totalSoFar = murdererCount + randomNeutralInnocentCount + randomNeutralKillerCount + randomInnocentCount;
        if (totalSoFar > playerCount) {
            randomInnocentCount = playerCount - (totalSoFar - randomInnocentCount);
        }
        let unassignedPlayers = playerCount - murdererCount - randomNeutralInnocentCount - randomNeutralKillerCount - randomInnocentCount;
        return { mCount: murdererCount, rmCount: randomMurdererCount, rNKCount: randomNeutralKillerCount, rNICount: randomNeutralInnocentCount, rICount: randomInnocentCount, iCount: unassignedPlayers }
    }

    /**
     * Gets the list of modifiers.
     * 
     * @param {boolean} sorted if true, returns the list sorted by id. Otherwise returns the list sorted by name.
     * @returns {Modifier[]} a list of all modifiers.
     */
    static getModifiers(sorted) {
        if (this.allModifiers.length == 0) {
            this._createModifiers();
        }
        return sorted ? this.allModifiers : this._allModifiersSorted;
    }

    /**
     * Gets the list of enabled modifiers.
     * 
     * @returns {Modifier[]}
     */
    static getEnabledModifiers() {
        let modifiersEnabled = ScoreboardManager.getTrackedObjective("settings.modifiers.enabled") != 0;
        if (!modifiersEnabled) {
            return [];
        }
        let enabled = [];
        let mods = this.getModifiers();
        mods.forEach((r) => {
            if (r.isEnabled()) {
                enabled.push(r);
            }
        });


        // if (ScoreboardManager.getTrackedObjective("assignment.random_murderers.min") < ScoreboardManager.getTrackedObjective("assignment.murderer_count.max")) {
        //     enabled.push(new MurdererRole());
        // }
        // let playerCount = this._sortPlayersWithoutTag(world.getAllPlayers(), "AFK").length;
        // let canRollInnocent = playerCount - ScoreboardManager.getTrackedObjective("assignment.murderer_count.min") - ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.min") - ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.min") - ScoreboardManager.getTrackedObjective("assignment.random_innocents.min");
        // if (canRollInnocent > 0) {
        //     enabled.push(new InnocentRole());
        // }

        return enabled;
    }

    /**
     * Sorts the given list of players to remove anyone with the inputted tag.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {String[]} tags the tags that players cannot have.
     * 
     * @returns {Player[]}
     */
    static _sortPlayersWithoutTag(players, tags) {
        let livePlayers = [];
        players.forEach((player) => {
            for (let i = 0; i < tags.length; i++) {
                if (player.hasTag(tags[i])) {
                    return;
                }
            }
            livePlayers.push(player);
        });
        return livePlayers;
    }

    // /**
    //  * Gets the list of enabled roles.
    //  * 
    //  * @returns {Role[]}
    //  */
    // static getInnocentRoles() {
    //     if (this.innocentRoles.length == 0) {
    //         this.getRoles();
    //     }
    //     return this.innocentRoles;
    // }

    // /**
    //  * Gets the list of enabled roles.
    //  * 
    //  * @returns {Role[]}
    //  */
    // static getNeutralKillerRoles() {
    //     if (this.neutralKRoles.length == 0) {
    //         this.getRoles();
    //     }
    //     return this.neutralKRoles;
    // }

    // /**
    //  * Gets the list of enabled roles.
    //  * 
    //  * @returns {Role[]}
    //  */
    // static getNeutralIndependentRoles() {
    //     if (this.neutralIRoles.length == 0) {
    //         this.getRoles();
    //     }
    //     return this.neutralIRoles;
    // }

    // /**
    //  * Gets the list of enabled roles.
    //  * 
    //  * @returns {Role[]}
    //  */
    // static getMurdererRoles() {
    //     if (this.murdererRoles.length == 0) {
    //         this.getRoles();
    //     }
    //     return this.murdererRoles;
    // }

    static async _createModifiers() {
        await this._buildModifiers();

        for (let i = 0; i < this.allModifiers.length; i++) {
            let mod = this.allModifiers[i];
            mod.initialize();
            // switch (role.getAlignment()) {
            //     case RoleAlignment.INNOCENT:
            //         this.innocentRoles.push(role);
            //         break;
            //     case RoleAlignment.MURDERER:
            //         this.murdererRoles.push(role);
            //         break;
            //     case RoleAlignment.NEUTRAL_INDEPENDENT:
            //     case RoleAlignment.NEUTRAL:
            //         this.neutralIRoles.push(role);
            //         break;
            //     case RoleAlignment.NEUTRAL_KILLER:
            //         this.neutralKRoles.push(role);
            //         break;
            // }

            // this.modifierList.set(mod.getRoleType().valueOf(), mod);
        }

        ModifierManager._sortModifiers();
    }

    static async _buildModifiers() {
        let categoriesEnabled = CategoriesEnabled;
            
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Found data " + JSON.stringify(categoriesEnabled)));
        this.allModifiers = [];
        
        for (let i = 0; i < categoriesEnabled.modifiersEnabled.length; i++) {
            let categoryName = categoriesEnabled.modifiersEnabled[i];
            await import("./current_modifiers/" + categoryName).then(async (categoryFile) => {
                let modifiers = categoryFile.ModifierData;
                await modifiers.forEach(async (modifierData) => {
                    const fileName = modifierData.file_name;
                    const modName = modifierData.class_name;
                    await import("./modifiers/" + fileName).then((modFile) => {
                        const Modifier = modFile[modName];
                        let newModifier = new Modifier();
                        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Importing modifier: " + newModifier.getDisplayName()));
                        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Role alignment: " + newRole.getAlignment().description));
                        this.allModifiers.push(newModifier);
                    }).catch((e) => {
                    });
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Viewing import of " + modName));
                });
            }).catch((e) => {
            });
        }

        this.allModifiers.sort((a, b) => {
            return Util.removeColorCodes(a.getDisplayName()).localeCompare(Util.removeColorCodes(b.getDisplayName()));
        });
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Modifiers imported: " + this.allModifiers.length));
        
        // this.allModifiers = [];
        
        // this.allModifiers.push(new LoversModifier());
        // this.allModifiers.push(new DoubleShotModifier());
        // this.allModifiers.push(new FlashModifier());
        // this.allModifiers.push(new TarotReaderModifier());
        // this.allModifiers.push(new SixthSenseModifier());
        // this.allModifiers.push(new RaidBossModifier());
        // this.allModifiers.push(new FrostyModifier());
        // this.allModifiers.push(new RottingModifier());
        // this.allModifiers.push(new ShyModifier());
        // this.allModifiers.push(new TelepathModifier());
        // this.allModifiers.push(new DiseasedModifier());
        // this.allModifiers.push(new DisperserModifier());
        // this.allModifiers.push(new RadarModifier());
        // this.allModifiers.push(new HackerModifier());
        // this.allModifiers.push(new LifestealModifier());
        // this.allModifiers.push(new AddictModifier());
        // this.allModifiers.push(new PricklyModifier());
        // this.allModifiers.push(new ShoutModifier());
        // this.allModifiers.push(new ComebackModifier());
        // this.allModifiers.push(new SniperModifier());
        // this.allModifiers.push(new RepelModifier());
        // this.allModifiers.push(new SentryModifier());
        // this.allModifiers.push(new GamblerModifier());
        // this.allModifiers.push(new AgentModifier());

    }

    static _sortModifiers() {
        ModifierManager.allModifiers.sort((a, b) => {
            let aModType = a.getModifierType();
            let bModType = b.getModifierType();
            let aId = aModType.id;
            let bId = bModType.id;
            if (aId == bId) {
                let aCustom = aModType.custom_id;
                let bCustom = bModType.custom_id;
                if (aCustom == -1) {
                    return 1;
                }
                if (bCustom == -1) {
                    return -1;
                }
                return aCustom > bCustom ? 1 : -1;
            }
            return aId > bId ? 1 : -1;
        });

        ModifierManager._allModifiersSorted = ModifierManager.allModifiers.slice().sort((a, b) => {
            return Util.removeColorCodes(a.getDisplayName()).localeCompare(Util.removeColorCodes(b.getDisplayName()));
        });;
    }

    /**
     * Sorts the inputted modifiers by if any of the inputted alignments or inputted roletypes can receive the modifier.
     * 
     * @param {Modifier[]} modifiers The list of roles being sorted through.
     * @param {RoleAlignment[]} roleAlignment The alignments to sort by.
     * @param {RoleTypes[]} roleTypes The roles to sort by.
     * @returns {Modifier[]} A list of modifiers that match the conditions.
     */
    static sortByTypes(modifiers, roleAlignments, roleTypes) {
        let validMods = [];

        if (roleAlignments == null && roleTypes == null) {
            return validMods;
        }

        modifiers.forEach((r) => {
            let alignments = r.getModifierAlignment().alignments;
            if (roleAlignments != null && roleAlignments.length != 0) {
                for (let i = 0; i < roleAlignments.length; i++) {
                    if (alignments.includes(roleAlignments[i])) {
                        validMods.push(r);
                        return;
                    }
                }
            }
            if (roleTypes != null && roleTypes.length != 0) {
                let validRoles = r.getWhitelistedRoles();
                for (let i = 0; i < roleTypes.length; i++) {
                    if (validRoles.includes(roleTypes[i])) {
                        validMods.push(r);
                        return;        
                    }
                }
            }
        });

        // world.getAllPlayers().forEach((pl) => pl.sendMessage(""));
        return validMods;
    }

    static rollRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min)) + min
    }
}