"use strict";

import { world, system, Player, ItemStack } from "@minecraft/server";
import { ScoreboardManager } from "./scoreboard_manager";
import { RoleManager } from "./role_manager";
import { PlayerHandler } from "./player_handler";
import { Role, RoleAlignment } from "./role";
import { Signal } from "./signal";
import { ModifierAssignment } from "./modifier_assignment";
import { RoleDraft } from "./role_draft";

export class RoleAssignment {
    /**
     * @type {Signal}
     */
    static afterRolesAssigned = new Signal();

    static ROLE_HISTORY_PROPERTY = "roleHistory";

    static assignRoles() {
        let auto = ScoreboardManager.getTrackedObjective("settings.role_assignment.enabled")
        let draft = ScoreboardManager.getTrackedObjective("settings.role_draft.enabled");

        if (auto == 2) {
            if (draft == 1) {
                this._runRoleDraft();
            }
            else {
                this._assignAutoRoles();
                ModifierAssignment.assignModifiers();
            }
        }
        else if (auto == 1) {
            this._detectPlayerBooks();
            ModifierAssignment.assignModifiers();
        }
        else {
            let playingPlayers = this._getPlayingPlayers(world.getAllPlayers());
            playingPlayers.forEach((pl) => {
                ScoreboardManager.setScoreboardObjective(pl, "player.role_id", 0);
            });
        }

    }

    static _assignAutoRoles() {
        let players = this._getPlayingPlayers(world.getPlayers());
        // players[0].sendMessage("Assigning " + players.length + " players roles");
        let roles = RoleManager.getRandomRoles();
        if (roles == null) {
            return;
        }
        RoleAssignment.clearPlayerBooks();

        if (roles.length != players.length) {
            players.forEach((player) => player.sendMessage("Something went wrong! The number of roles (" + roles.length + ") does not match the number of players (" + players.length + ")"));
            return;
        }

        // let test = [1, 2, 3, 4, 5];
        // test.splice(2, 1);
        // players[0].sendMessage("" + test);

        while (roles.length > 0) {
            let randomRoleIndex = this.rollRandomNumber(0, roles.length);
            let randomPlayerIndex = this.rollRandomNumber(0, players.length);

            let randomRole = roles[randomRoleIndex];
            let randomPlayer = players[randomPlayerIndex];

            this.setPlayerRole(randomPlayer, randomRole, true);
            let book = RoleAssignment._createBookForRole(randomRole);
            randomPlayer.addItem(book);
            // Source - https://stackoverflow.com/a/24909567
            // Posted by Ferdi265, modified by community. See post 'Timeline' for change history
            // Retrieved 2026-05-13, License - CC BY-SA 3.0

            roles.splice(randomRoleIndex, 1);
            // roles.pop();
            players.splice(randomPlayerIndex, 1);
            // players.pop();
        }

        this.afterRolesAssigned.emit();
    }

    static _runRoleDraft() {
        RoleDraft.startRoleDraft();
    }

    /**
     * @returns {Player[]}
     */
    static _getPlayingPlayers(players) {
        let livePlayers = [];
        players.forEach((player) => {
            if (!player.hasTag("AFK")) {
                livePlayers.push(player);
            }
        });
        return livePlayers;
    }

    static _detectPlayerBooks() {
        let playingPlayers = this._getPlayingPlayers(world.getAllPlayers());
        // playingPlayers[0].getComponents().forEach((comp) => {
        //     world.getAllPlayers()[0].sendMessage("player has component " + comp.typeId);
        // });

        for (let p = 0; p < playingPlayers.length; p++) {
            let player = playingPlayers[p];
            let inventory = player.getComponent("minecraft:inventory").container;
            let book;

            for (let slot = 0; slot < inventory.size; slot++) {
                // playingPlayers[0].sendMessage("Checking slot " + slot);
                let itemStack = inventory.getItem(slot);
                if (itemStack != null && itemStack.typeId == "umm:role_book") {
                    // playingPlayers[0].sendMessage("Found book at slot " + slot);
                    book = itemStack;
                    break;
                }
            }

            if (book == null) {
                player.sendMessage("You didn't have a book!");
                ScoreboardManager.setScoreboardObjective(player, "player.player_id", -1);
                continue;
            }

            let bookID = book.getDynamicProperty("role_id");
            let customID = book.getDynamicProperty("custom_id");
            let role = RoleManager.getMatchingRole(bookID, customID);
            if (role == null) {
                world.getAllPlayers()[0].sendMessage("ERROR: player " + player.name + " has a book with undefined role ID " + bookID);
                continue;
            }

            this.setPlayerRole(player, role, true);
        }

        this.afterRolesAssigned.emit();

        // playingPlayers.forEach((player) => {

        // });
    }

    /**
     * Sets a player's role to be the inputted role.
     * 
     * @param {Player} player the player to be set.
     * @param {Role} role the role to set the player to.
     * @param {boolean} titleRole whether to title the player their role.
     * @param {boolean} hideFromHistory if true, does not add this role to role history.
     */
    static setPlayerRole(player, role, titleRole, hideFromHistory) {
        let roleName = role.getDisplayName();
        let lineColor = RoleAssignment._getRoleAssignmentColor(role.getAlignment());
        player.sendMessage(lineColor + "Your role is " + roleName + "§r" + lineColor + "! " + role.getRoleDescription() + " " + this._getRoleAlignmentDescription(role.getAlignment()));// + " If this is wrong please report it to a developer.");
        ScoreboardManager.setScoreboardObjective(player, "player.role_id", role.getRoleType().id);
        if (titleRole) {
            player.onScreenDisplay.setTitle(lineColor + roleName, {subtitle: lineColor + "is your role...", stayDuration: 20*3, fadeInDuration: 5, fadeOutDuration: 10});
        }
        role.giveToPlayer(player);
        if (!hideFromHistory) {
            RoleAssignment.addToPlayerRoleHistory(player, role);
        }
        PlayerHandler.giveRoleActionItem(player);
        PlayerHandler.giveRoleGuessItem(player);
        PlayerHandler.updateRoleActionVisual(player);
    }

    /**
     * 
     * @param {RoleAlignment} alignment 
     */
    static _getRoleAssignmentColor(alignment) {
        switch (alignment) {
            case RoleAlignment.INNOCENT:
                return "§a";
            case RoleAlignment.MURDERER:
                return "§c";
            case RoleAlignment.NEUTRAL_INDEPENDENT:
                return "§b";
            case RoleAlignment.NEUTRAL_KILLER:
                return "§d";
        }
    }

    /**
     * @param {RoleAlignment}
     */
    static _getRoleAlignmentDescription(alignment) {
        switch (alignment) {
            case RoleAlignment.INNOCENT:
                return "Find the murderers and help your team win!";
            case RoleAlignment.MURDERER:
                return "Kill all other players!";
            case RoleAlignment.NEUTRAL_INDEPENDENT:
                return "Complete your objective and live to win!";
            case RoleAlignment.NEUTRAL_KILLER:
                return "Be the last player standing!";
        }
    }

    static clearPlayerBooks() {
        world.getAllPlayers().forEach((player) => {
            let inventory = player.getComponent("minecraft:inventory").container;
            for (let slot = 0; slot < inventory.size; slot++) {
                // playingPlayers[0].sendMessage("Checking slot " + slot);
                let itemStack = inventory.getItem(slot);
                if (itemStack != null && itemStack.typeId == "umm:role_book") {
                    inventory.setItem(slot, null);
                }
            }
        });
    }

    /**
     * Fills the dispenser inputted with books.
     */
    static _fillDispenser() {
        let dispenserX = ScoreboardManager.getTrackedObjective("book_dispenser.x");
        let dispenserY = ScoreboardManager.getTrackedObjective("book_dispenser.y");
        let dispenserZ = ScoreboardManager.getTrackedObjective("book_dispenser.z");
        let dispenserDim = ScoreboardManager.getTrackedObjective("book_dispenser.dim");
        let dispenserBlock = world.getDimension(this.dimensionIDToString(dispenserDim)).getBlock({ x: dispenserX, y: dispenserY, z: dispenserZ });

        let hopperX = ScoreboardManager.getTrackedObjective("book_hopper.x");
        let hopperY = ScoreboardManager.getTrackedObjective("book_hopper.y");
        let hopperZ = ScoreboardManager.getTrackedObjective("book_hopper.z");
        let hopperDim = ScoreboardManager.getTrackedObjective("book_hopper.dim");
        let hopperBlock = world.getDimension(this.dimensionIDToString(hopperDim)).getBlock({ x: hopperX, y: hopperY, z: hopperZ });
        // world.getAllPlayers()[0].sendMessage("Finding block " + dispenserBlock.typeId + " with components ");
        // dispenserBlock.getComponents().forEach((comp) => {
        //     world.getAllPlayers()[0].sendMessage("has component " + comp.typeId);
        // });
        if (dispenserBlock.hasComponent("inventory")) {
            let dispenserContainer = dispenserBlock.getComponent("inventory").container;
            // container.clearAll();
            // container.addItem({type:});
            // world.getAllPlayers()[0].sendMessage("Found a block with an inventory, first item is " + container.getItem(0));

            // container.getItem(0).getComponents().forEach((comp) => {
            //     world.getAllPlayers()[0].sendMessage("has component " + comp.typeId);
            // });
            let players = this._getPlayingPlayers(world.getPlayers());
            world.sendMessage("Filling the dispenser with " + players.length + " roles");
            let roles = RoleManager.getRandomRoles();
            // players[0].sendMessage("Filling the dispenser with " + roles.length + " roles");
            if (roles == null) {
                return;
            }

            let hopperContainer = null;
            if (roles.length > 9) {
                if (hopperBlock.hasComponent("inventory")) {
                    hopperContainer = hopperBlock.getComponent("inventory").container;
                }
                else {
                    world.sendMessage("A hopper needs to be set since there are more than 9 books but none is set.");
                    return;
                }
            }

            if (roles.length != players.length) {
                world.sendMessage("Something went wrong! The number of roles (" + roles.length + ") does not match the number of players (" + players.length + ")");
                return;
            }

            for (let i = 0; i < roles.length; i++) {
                let role = roles[i];
                let newBook = this._createBookForRole(role);
                this._addBookToDispenser(dispenserContainer, hopperContainer, hopperBlock, i, newBook);
            }
            // roles.forEach((role) => {
            //     this._addBookToDispenser(dispenserContainer, hopper)
            //     dispenserContainer.addItem(newBook);
            // });
        }
        else {
            world.sendMessage("Couldn't find dispenser. Ensure the dispenser was properly set");
        }
    }

    /**
     * @param {Container} dispenserInventory
     * @param {Container} hopperInventory
     * @param {Block} hopperBlock
     * @param {number} roleIndex
     * @param {ItemStack} book
     */
    static _addBookToDispenser(dispenserInventory, hopperInventory, hopperBlock, roleIndex, book) {
        if (roleIndex < 9) {
            dispenserInventory.addItem(book);
        }
        else if (roleIndex < 14) {
            hopperInventory.addItem(book);
        }
        else {
            let hopperLocation = hopperBlock.location;
            hopperBlock.dimension.spawnItem(book, { x: hopperLocation.x + .5, y: hopperLocation.y + 1, z: hopperLocation.z + .5 });
        }
    }

    /**
     * Resets the given player's role history to nothing.
     * @param {Player} player 
     */
    static resetPlayerRoleHistory(player) {
        player.setDynamicProperty(RoleAssignment.ROLE_HISTORY_PROPERTY, "[]");
    }

    /**
     * Adds a new role to a player's role history.
     * @param {Player} player 
     * @param {Role} newRole 
     */
    static addToPlayerRoleHistory(player, newRole) {
        let history = RoleAssignment.getPlayerRoleHistory(player);
        history.push(new RoleStorageData(newRole));
        player.setDynamicProperty(RoleAssignment.ROLE_HISTORY_PROPERTY, JSON.stringify(history));
    }

    /**
     * Gets the role history of a player.
     * @param {Player} player 
     * @returns {RoleStorageData[]} a list of role ids. Lower indexes were received earlier.
     */
    static getPlayerRoleHistory(player) {
        return JSON.parse(player.getDynamicProperty(RoleAssignment.ROLE_HISTORY_PROPERTY));
    }

    /**
     * Creates and returns a role book for the inputted role.
     * 
     * @param {Role} role the role the book represents.
     * @returns {ItemStack}
     */
    static _createBookForRole(role) {
        let newBook = new ItemStack("umm:role_book", 1);

        newBook.setDynamicProperty("role_id", role.getRoleType().id);
        if (Object.hasOwn(role.getRoleType(), "custom_id")) {
            newBook.setDynamicProperty("custom_id", role.getRoleType().custom_id);
        }
        newBook.nameTag = "§r" + role.getDisplayName();
        return newBook;
    }

    static rollRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min)) + min
    }

    /**
     * Converts a dimension's number id to its string ID. 
     * 
     * @param {number} dimID the numerical id associated with the dimension.
     * @return {string} the identifier for the dimension.
     */
    static dimensionIDToString(dimID) {
        switch (dimID) {
            case 0:
                return "minecraft:overworld"
            case 1:
                return "minecraft:nether"
            case 2:
                return "minecraft:the_end"
            default:
                return "null"
        }
    }

}

export class RoleStorageData {
    /**
     * 
     * @param {Role} role 
     */
    constructor(role) {
        let roleType = role.getRoleType(); 
        let roleID = roleType.id;
        let customID = Object.hasOwn(roleType, "custom_id") ? roleType.custom_id : -1;
        this.roleID = roleID;
        this.customID = customID;
    }

    /**
     * @returns {Role}
     */
    static getRole(storageData) {
        return RoleManager.getMatchingRole(storageData.roleID, storageData.customID);
    }
}