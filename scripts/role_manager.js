"use strict";

import { world, system } from "@minecraft/server";

import { Role, RoleAlignment, RoleTypes } from "./role";
// importing all the roles :skull:
import { InnocentRole } from "./roles/innocent";
import { MurdererRole } from "./roles/murderer";

import { ScoreboardManager } from "./scoreboard_manager";
import { Util } from "./util";
import { CategoriesEnabled }  from "./current_roles/roles_enabled";// with { type: "json" };

export class RoleManager {
    /**
     * @type {Role[]}
     */
    static allRoles = [];
    static _allRolesSorted = [];
    static murdererRoles = [];
    static innocentRoles = [];
    static neutralKRoles = [];
    static neutralIRoles = [];

    static initialize() {
        RoleManager.getRoles().forEach((role) => {
            ScoreboardManager.createScoreboardObjective("role_settings." + role.getRoleType().name + ".role_count");
            let createdWeight = ScoreboardManager.createScoreboardObjective("role_settings." + role.getRoleType().name + ".weight");
            if (createdWeight) {
                ScoreboardManager.setTrackedObjective("role_settings." + role.getRoleType().name + ".weight", 50);
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
     * Returns the matching role with the inputted role ID.
     * 
     * @param {number?} customID The custom id of the role, if a custom role
     * @return {Role} the role associated with the role type, or null if not found.
     */
    static getMatchingRole(roleID, customID) {
        let roles = this.getRoles();
        let playerRef = world.getAllPlayers()[0];
        // playerRef.sendMessage("" + roles.length);
        let outRole = RoleManager.searchForRole(roleID, customID);
        // roles.forEach((r) => {
        //     // playerRef.sendMessage("Checking role with id " + r.getRoleType().id + ", looking for " + roleID);
        //     let roleType = r.getRoleType();
        //     if (roleType.id == roleID && (customID == null || customID == -1 || (Object.hasOwn(roleType, "custom_id") && roleType.custom_id == customID))) {
        //         // playerRef.sendMessage("Returning value");
        //         outRole = r;
        //     }
        // });
        if (outRole == null) {
            playerRef.sendMessage("ERROR: Role not found of index " + roleID);
            return null;
        }
        return outRole
    }

    /**
     * 
     * @param {number} searchID 
     * @param {number} customID 
     */
    static searchForRole(searchID, useCustomId) {
        let roleIndex = -1;
        let backupRoleIndex = -1;
        let roles = RoleManager.getRoles(true);
        let min = 0; // min index
        let max = roles.length; // max index
        let smallestID = roles[min].getRoleType().id
        let largestID = roles[max-1].getRoleType().id
        let validID = searchID <= largestID && searchID >= smallestID;
        let halfway = searchID < max && searchID >= min && validID ? searchID : Math.floor((max - min) / 2) + min;
        while (max >= min && validID && halfway < roles.length) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Checking role index " + halfway + " (" + min + "-" + max + ")"));
            let roleToCheck = roles[halfway];
            let roleID = roleToCheck.getRoleType().id;
            let roleCustomID = roleToCheck.getRoleType().custom_id;
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Role ids: " + roleID + " (" + roleCustomID + ")"));
            if (roleID == searchID) {
                if (backupRoleIndex == -1) {
                    backupRoleIndex = halfway;
                }
                if (roleCustomID == null || roleCustomID == -1) {
                    backupRoleIndex = halfway;
                    roleCustomID = -1;
                    if (useCustomId == -1) {
                        break;
                    }
                }
                if (useCustomId > roleCustomID) {
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Incrementing min to " + (halfway+1)));
                    min = halfway + 1;
                }
                if (useCustomId < roleCustomID) {
                    // world.getAllPlayers().forEach((pl) => pl.sendMessage("Incrementing max to " + (halfway-1)));
                    max = halfway - 1;
                }
                if (useCustomId == null || useCustomId == roleCustomID) {
                    roleIndex = halfway;
                    break;
                }
            }
            if (roleID > searchID) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Incrementing max to " + (halfway-1)));
                max = halfway - 1;
            }
            if (roleID < searchID) {
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Incrementing min to " + (halfway+1)));
                min = halfway + 1;
            }
            
            halfway = Math.floor((max - min) / 2) + min;
        }

        if (roleIndex == -1 && backupRoleIndex != -1) {
            roleIndex = backupRoleIndex;
        }

        return roleIndex == -1 ? null : roles[roleIndex];
    }

    /**
     * Returns the role of the inputted entity.
     * 
     * @return {Role}
     */
    static getPlayerRole(entity) {
        let roleValue = ScoreboardManager.getScoreboardObjective(entity, "player.role_id");
        let customID = ScoreboardManager.getScoreboardObjective(entity, "player.custom_role_id");
        let role = RoleManager.getMatchingRole(roleValue, customID != -1 ? customID : null);
        return role;
    }

    /**
     * Returns a list of roles that will be used for the next game.
     * 
     * @returns {Role[]} a list of random roles that will be used.
     */
    static getRandomRoles() {
        let selectedRoles = [];

        let enabledRoles = this.getEnabledRoles();
        let possibleRoles = [];
        if (enabledRoles.length) {
            enabledRoles.forEach((role) => {
                if (role.getRoleType() == RoleTypes.MURDERER || role.getRoleType() == RoleTypes.INNOCENT) {
                    return;
                }
                let roleCount = ScoreboardManager.getTrackedObjective("role_settings." + role.getRoleType().name + ".role_count");
                let roleWeight = ScoreboardManager.getTrackedObjective("role_settings." + role.getRoleType().name + ".weight");
                while (roleCount > 0) {
                    possibleRoles.push({role:role, weight:roleWeight});
                    roleCount--;
                }
            });
        }
        // let message = "Role roles in pool: ";
        // possibleRoles.forEach((role) => {
        //     message += role.getDisplayName() + ", ";
        // });
        // world.getAllPlayers().forEach((player) => {
        //     player.sendMessage(message);
        // });
        let roleCounts = this.getRoleCounts();
        if (roleCounts == null) {
            return;
        }
        let murdererCount = roleCounts.mCount;
        let randomMurdererCount = roleCounts.rmCount;
        let randomNeutralKillerCount = roleCounts.rNKCount;
        let randomNeutralInnocentCount = roleCounts.rNICount;
        let randomInnocentCount = roleCounts.rICount;
        let unassignedPlayers = roleCounts.iCount;

        // MURDERER roles 
        let murdererRoles = RoleManager.sortObjectListByType(possibleRoles, RoleAlignment.MURDERER);
        let priorityMurdererRoles = murdererRoles.filter((r) => r.weight >= 101);
        murdererRoles = murdererRoles.filter((r) => r.weight <= 100);
        // murdererRoles.forEach((role) => {
        //     world.getAllPlayers()[0].sendMessage("Role is listed " + role.getDisplayName());
        // });
        // random
        // world.getAllPlayers()[0].sendMessage("filling with " + murdererCount + " and " + randomMurdererCount + " roles");
        for (let i = 0; i < randomMurdererCount; i++) {
            let rolesToPull = priorityMurdererRoles.length == 0 ? murdererRoles : priorityMurdererRoles;
            if (rolesToPull.length == 0) {
                selectedRoles.push(new MurdererRole());
                continue;
            }
            
            let randomIndex = Util.rollWeights(rolesToPull.map((ro) => ro.weight));
            if (randomIndex < 0) {
                randomIndex = ScoreboardManager.rollRandomNumber(0, rolesToPull.length);
            }
            selectedRoles.push(rolesToPull[randomIndex].role);
            rolesToPull.splice(randomIndex, 1);
        }
        // remaining murderers
        for (let i = 0; i < murdererCount - randomMurdererCount; i++) {
            selectedRoles.push(new MurdererRole());
        }

        // let message = "Murderers: " + murdererCount + "\nNK: " + randomNeutralKillerCount + "\nNI: " + randomNeutralInnocentCount + "\nInnos: " + randomInnocentCount + "\nUnnassigned: " + unassignedPlayers;
        // world.getAllPlayers().forEach((player) => {
        //     player.sendMessage(message);
        //     // player.sendMessage("Currently have " + murdererCount + " murderers with " + randomMurdererCount + " random murderers");
        // });

        // Neutral Killers
        let neutralKillingRoles = RoleManager.sortObjectListByType(possibleRoles, RoleAlignment.NEUTRAL_KILLER);
        let priorityKillingRoles = neutralKillingRoles.filter((r) => r.weight >= 101);
        neutralKillingRoles = neutralKillingRoles.filter((r) => r.weight <= 100);
        for (let i = 0; i < randomNeutralKillerCount; i++) {
            let rolesToPull = priorityKillingRoles.length == 0 ? neutralKillingRoles : priorityKillingRoles;
            if (rolesToPull.length <= 0) {
                unassignedPlayers++;
                continue;
            }
            
            let randomIndex = Util.rollWeights(rolesToPull.map((ro) => ro.weight));
            if (randomIndex < 0) {
                randomIndex = ScoreboardManager.rollRandomNumber(0, rolesToPull.length);
            }
            selectedRoles.push(rolesToPull[randomIndex].role);
            rolesToPull.splice(randomIndex, 1);
        }

        // Neutral Independent
        let neutralIndependentRoles = RoleManager.sortObjectListByType(possibleRoles, RoleAlignment.NEUTRAL_INDEPENDENT);
        let priorityIndependentRoles = neutralIndependentRoles.filter((r) => r.weight >= 101);
        neutralIndependentRoles = neutralIndependentRoles.filter((r) => r.weight <= 100);
        for (let i = 0; i < randomNeutralInnocentCount; i++) {
            let rolesToPull = priorityIndependentRoles.length == 0 ? neutralIndependentRoles : priorityIndependentRoles;
            if (rolesToPull.length <= 0) {
                unassignedPlayers++;
                continue;
            }
            let randomIndex = Util.rollWeights(rolesToPull.map((ro) => ro.weight));
            if (randomIndex < 0) {
                randomIndex = ScoreboardManager.rollRandomNumber(0, rolesToPull.length);
            }
            selectedRoles.push(rolesToPull[randomIndex].role);
            rolesToPull.splice(randomIndex, 1);
        }

        // Innocents
        let randomInnocentRoles = RoleManager.sortObjectListByType(possibleRoles, RoleAlignment.INNOCENT);
        let priorityInnocentRoles = randomInnocentRoles.filter((r) => r.weight >= 101);
        randomInnocentRoles = randomInnocentRoles.filter((r) => r.weight <= 100);
        // random
        for (let i = 0; i < randomInnocentCount; i++) {
            let rolesToPull = priorityInnocentRoles.length == 0 ? randomInnocentRoles : priorityInnocentRoles;
            // world.getAllPlayers().forEach((player) => player.sendMessage("Roles to pull: " + rolesToPull.length));
            if (rolesToPull.length <= 0) {
                unassignedPlayers++;
                continue;
            }
            let randomIndex = Util.rollWeights(rolesToPull.map((ro) => ro.weight));
            if (randomIndex < 0) {
                randomIndex = ScoreboardManager.rollRandomNumber(0, randomInnocentCount.length);
            }
            selectedRoles.push(rolesToPull[randomIndex].role);
            // world.getAllPlayers().forEach((player) => player.sendMessage("Adding role of index " + randomIndex + ": "));
            // world.getAllPlayers().forEach((player) => player.sendMessage("Adding role of index " + randomIndex + ": " + rolesToPull[randomIndex].role.getDisplayName()));
            rolesToPull.splice(randomIndex, 1);
        }
        
        for (let i = 0; i < unassignedPlayers; i++) {
            // world.getAllPlayers().forEach((player) => player.sendMessage("Adding an unassigned player"));
            selectedRoles.push(new InnocentRole());
        }

        // world.getAllPlayers().forEach((player) => {
        //     player.sendMessage("Currently have " + unassignedPlayers + " assigned players");
        // });

        return selectedRoles;
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
        
        let randomNeutralKillerCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.min"), ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.max") + 1);
        if (murdererCount == 0 && randomNeutralKillerCount == 0) {
            murdererCount = 1;
        }

        let randomMurdererCount = this.rollRandomNumber(ScoreboardManager.getTrackedObjective("assignment.random_murderers.min"), ScoreboardManager.getTrackedObjective("assignment.random_murderers.max") + 1);
        if (randomMurdererCount > murdererCount) {
            randomMurdererCount = murdererCount;
        }
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
     * Gets the list of roles.
     * 
     * @param {boolean} sorted if true, returns the list sorted by id. Otherwise returns the list sorted by name.
     * @returns {Role[]} a list of all roles.
     */
    static getRoles(sorted) {
        if (RoleManager.allRoles.length == 0) {
            this._createRoles();
        }
        return sorted ? RoleManager.allRoles : RoleManager._allRolesSorted;
    }

    /**
     * Gets the list of enabled roles.
     * 
     * @returns {Role[]}
     */
    static getEnabledRoles() {
        let enabled = [];
        let roles = this.getRoles(false);
        roles.forEach((r) => {
            if (r.isEnabled()) {
                enabled.push(r);
            }
        });


        if (ScoreboardManager.getTrackedObjective("assignment.random_murderers.min") < ScoreboardManager.getTrackedObjective("assignment.murderer_count.max")) {
            enabled.push(new MurdererRole());
        }
        let playerCount = this._sortPlayersWithoutTag(world.getAllPlayers(), "AFK").length;
        let canRollInnocent = playerCount - ScoreboardManager.getTrackedObjective("assignment.murderer_count.min") - ScoreboardManager.getTrackedObjective("assignment.random_neutral_independents.min") - ScoreboardManager.getTrackedObjective("assignment.random_neutral_killers.min") - ScoreboardManager.getTrackedObjective("assignment.random_innocents.min");
        if (canRollInnocent > 0) {
            enabled.push(new InnocentRole());
        }

        return enabled;
    }


    /**
     * Sorts the given list of players to remove anyone with the inputted tag.
     * 
     * @param {Player[]} players the list of players to sort.
     * @param {String[]} tag the tag that players cannot have.
     * 
     * @returns {Player[]}
     */
    static _sortPlayersWithoutTag(players, tag) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag(tag)) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    /**
     * Gets the list of enabled roles.
     * 
     * @returns {Role[]}
     */
    static getInnocentRoles() {
        if (this.innocentRoles.length == 0) {
            this.getRoles();
        }
        return this.innocentRoles;
    }

    /**
     * Gets the list of enabled roles.
     * 
     * @returns {Role[]}
     */
    static getNeutralKillerRoles() {
        if (this.neutralKRoles.length == 0) {
            this.getRoles();
        }
        return this.neutralKRoles;
    }

    /**
     * Gets the list of enabled roles.
     * 
     * @returns {Role[]}
     */
    static getNeutralIndependentRoles() {
        if (this.neutralIRoles.length == 0) {
            this.getRoles();
        }
        return this.neutralIRoles;
    }

    /**
     * Gets the list of enabled roles.
     * 
     * @returns {Role[]}
     */
    static getMurdererRoles() {
        if (this.murdererRoles.length == 0) {
            this.getRoles();
        }
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Murderer roles: " + this.murdererRoles.length));
        return this.murdererRoles;
    }

    static async _createRoles() {
        if (RoleManager.allRoles.length > 0) {
            return;
        }
        await this._buildRoles();
        RoleManager._sortRoles();

        let rolesToSort = RoleManager._allRolesSorted;
        for (let i = 0; i < rolesToSort.length; i++) {
            let role = rolesToSort[i];
            role.initialize();
            switch (role.getAlignment()) {
                case RoleAlignment.INNOCENT:
                    this.innocentRoles.push(role);
                    break;
                case RoleAlignment.MURDERER:
                    this.murdererRoles.push(role);
                    break;
                case RoleAlignment.NEUTRAL_INDEPENDENT:
                case RoleAlignment.NEUTRAL:
                    this.neutralIRoles.push(role);
                    break;
                case RoleAlignment.NEUTRAL_KILLER:
                    this.neutralKRoles.push(role);
                    break;
                default:  
                    break;
            }
        }

        // world.getAllPlayers().forEach((pl) => {
        //     RoleManager.allRoles.forEach((r) => {
        //         pl.sendMessage(r.getRoleType().id + "");
        //     });
        // });
    }

    static async _buildRoles() {
        let categoriesEnabled = CategoriesEnabled;
        
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Found data " + JSON.stringify(categoriesEnabled)));
        RoleManager.allRoles = [];
        
        for (let i = 0; i < categoriesEnabled.rolesEnabled.length; i++) {
            let categoryName = categoriesEnabled.rolesEnabled[i];
            await import("./current_roles/" + categoryName).then(async (categoryFile) => {
                let roles = categoryFile.RoleData;
                await roles.forEach(async (roleData) => {
                    const fileName = roleData.file_name;
                    const roleName = roleData.class_name;
                    await import("./roles/" + fileName).then((roleFile) => {
                        const Role = roleFile[roleName];
                        let newRole = new Role();
                        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Importing role: " + newRole.getDisplayName()));
                        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Role alignment: " + newRole.getAlignment().description));
                        RoleManager.allRoles.push(newRole);
                    }).catch((e) => {
                        world.sendMessage("Something went wrong when importing " + roleName);
                    });
                });
            }).catch((e) => {
            });
        }

        return true;
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Roles imported: " + RoleManager.allRoles.length));
        // import('./current_roles/escapist.json').then((module) => {
        //     const fileName = module.file_name;
        //     const roleName = module.class_name;
        //     import("./roles/" + fileName).then((roleFile) => {
        //         const Role = roleFile.default;
        //         this.allRoles.push(new Role());
        //     });
        // }).catch((e) => {
        //     world.getAllPlayers().forEach((pl) => pl.sendMessage("Failed to imported escapist"));
        //     return;
        // });
        // await import("./roles/escapist").then((roleFile) => {
        //     const Role = roleFile["EscapistRole"];
        //     let newRole = new Role();
        //     world.getAllPlayers().forEach((pl) => pl.sendMessage("Escapist alignment: " + newRole.getAlignment().description));
        //     this.allRoles.push(newRole);
        // });

        // this.allRoles.push(new InnocentRole());
        // this.allRoles.push(new MurdererRole());

        // this.allRoles.push(new DetectiveRole());
        // this.allRoles.push(new JesterRole());
        // this.allRoles.push(new WardenRole());
        // this.allRoles.push(new SoulRole());
        // this.allRoles.push(new RevealerRole());
        // this.allRoles.push(new VigilanteRole());
        // this.allRoles.push(new SheriffRole());
        // this.allRoles.push(new HexRole());
        // this.allRoles.push(new TricksterRole());
        // this.allRoles.push(new BodyguardRole());
        // this.allRoles.push(new AmnesiacRole());
        // this.allRoles.push(new TrackerRole());
        // this.allRoles.push(new TransporterRole());
        // this.allRoles.push(new AssassinRole());
        // this.allRoles.push(new DoubleAgentRole());
        // this.allRoles.push(new InvestigatorRole());
        // this.allRoles.push(new AltruistRole());
        // this.allRoles.push(new SurvivorRole());
        // // this.allRoles.push(new EscapistRole());
        // this.allRoles.push(new SwooperRole());
        // this.allRoles.push(new JanitorRole());
        // this.allRoles.push(new ApothocaryRole());
        // this.allRoles.push(new TechnicianRole());
        // this.allRoles.push(new MedicRole());
        // this.allRoles.push(new MysticRole());
        // this.allRoles.push(new ClericRole());
        // this.allRoles.push(new BomberRole());
        // this.allRoles.push(new SpyRole());
        // this.allRoles.push(new WarlockRole());
        // this.allRoles.push(new NecromancerRole());
        // this.allRoles.push(new SerialKillerRole());
        // this.allRoles.push(new GlitchRole());
        // this.allRoles.push(new VampireRole());
        // this.allRoles.push(new JailorRole());
        // this.allRoles.push(new CryomancerRole());
        // this.allRoles.push(new TempestRole());
        // this.allRoles.push(new GhostWriterRole());
        // this.allRoles.push(new WitchRole());
        // this.allRoles.push(new TrapperRole());
        // this.allRoles.push(new MediumRole());
        // this.allRoles.push(new MorticianRole());
        // this.allRoles.push(new OfficerRole());
        // this.allRoles.push(new ShadowmancerRole());
        // this.allRoles.push(new ArtemisRole());
        // this.allRoles.push(new StalkerRole());
        // this.allRoles.push(new PlagueBearerRole());
        // this.allRoles.push(new DoppelGangerRole());
        // this.allRoles.push(new GravewalkerRole());
        // this.allRoles.push(new VeteranRole());
    }

    /**
     * 
     * @param {Role[]} roleList 
     */
    static sortRolesByName(roleList) {
        roleList.sort((a, b) => {
            return Util.removeColorCodes(a.getDisplayName()).localeCompare(Util.removeColorCodes(b.getDisplayName()));
        });
    }

    static _sortRoles() {
        RoleManager.allRoles.sort((a, b) => {
            let aRoleType = a.getRoleType();
            let bRoleType = b.getRoleType();
            let aId = aRoleType.id;
            let bId = bRoleType.id;
            if (aId == bId) {
                let aCustom = aRoleType.custom_id;
                let bCustom = bRoleType.custom_id;
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

        RoleManager._allRolesSorted = RoleManager.allRoles.slice().sort((a, b) => {
            return Util.removeColorCodes(a.getDisplayName()).localeCompare(Util.removeColorCodes(b.getDisplayName()));
        });;
    }

    /**
     * 
     * @param {Role} role 
     */
    static addNewRole(role) {
        RoleManager.allRoles.push(role);
        role.initialize();
        switch (role.getAlignment()) {
            case RoleAlignment.INNOCENT:
                this.innocentRoles.push(role);
                RoleManager.sortRolesByName(this.innocentRoles);
                break;
            case RoleAlignment.MURDERER:
                this.murdererRoles.push(role);
                RoleManager.sortRolesByName(this.murdererRoles);
                break;
            case RoleAlignment.NEUTRAL_INDEPENDENT:
            case RoleAlignment.NEUTRAL:
                this.neutralIRoles.push(role);
                RoleManager.sortRolesByName(this.neutralIRoles);
                break;
            case RoleAlignment.NEUTRAL_KILLER:
                this.neutralKRoles.push(role);
                RoleManager.sortRolesByName(this.neutralKRoles);
                break;
            default:  
                break;
        }
        RoleManager._sortRoles();
    }

    /**
     * Sorts the inputted roles by the given type and returns a new array with the valid type.
     * 
     * @param {Object[]} roles The list of roles, where the object has a role key.
     * @param {RoleAlignment} roleAlignment The alignment to sort by.
     * @returns {Role[]} A list of roles that match the alignment.
     */
    static sortObjectListByType(roles, roleAlignment) {
        let validRoles = [];

        roles.forEach((r) => {
            if (r.role.getAlignment() == roleAlignment) {
                validRoles.push(r);
            }
        });

        return validRoles;
    }

    /**
     * Sorts the inputted roles by the given type and returns a new array with the valid type.
     * 
     * @param {Role[]} roles The list of roles being sorted through.
     * @param {RoleAlignment} roleAlignment The alignment to sort by.
     * @returns {Role[]} A list of roles that match the alignment.
     */
    static sortByType(roles, roleAlignment) {
        let validRoles = [];

        roles.forEach((r) => {
            if (r.getAlignment() == roleAlignment) {
                validRoles.push(r);
            }
        });

        return validRoles;
    }

    /**
     * Sorts the inputted roles by the given types and returns a new array with only the valid types.
     * 
     * @param {Role[]} roles The list of roles being sorted through.
     * @param {RoleAlignment[]} alignments The alignments to sort by.
     * @returns {Role[]} A list of roles that match the alignment.
     */
    static sortByTypes(roles, alignments) {
        let validRoles = [];

        if (alignments == null || alignments.length == 0) {
            return validRoles;
        }

        roles.forEach((r) => {
            if (alignments.includes(r.getAlignment())) {
                validRoles.push(r);
            }
        });

        return validRoles;
    }

    static rollRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min)) + min
    }
}