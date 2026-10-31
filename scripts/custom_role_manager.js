"use strict";

import { world, Player } from "@minecraft/server";
import { ActionFormData, CustomForm, ModalFormData, ObservableString } from "@minecraft/server-ui";
import { CustomRole } from "./roles/custom_role";
import { RoleManager } from "./role_manager";
import { RoleAlignment } from "./role";
import { SoundManager } from "./sound_manager";
import { SettingsHandler } from "./settings_handler";

export class CustomRoleManager {

    static CUSTOM_ROLES_SAVE_KEY = "allCustomRoles";
    /**
     * @type {CustomRole[]}
     */
    static customRoles = [];

    static initialize() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while reloading custom roles. Please notify a dev.");
            }
            return;
        }

        if (this.initialized) {
            return;
        }

        this.initialized = true;
        if (!armorStand.getDynamicPropertyIds().includes(CustomRoleManager.CUSTOM_ROLES_SAVE_KEY)) {
            // world.getAllPlayers().forEach((pl) => pl.sendMessage("Creating armor stand"));
            armorStand.setDynamicProperty(CustomRoleManager.CUSTOM_ROLES_SAVE_KEY, "[]");
            return;
        }
        else {
            // world.getAllPlayers().forEach((p) => p.sendMessage("Getting definitions from sound stand"));
            // let tags = armorStand.getTags();
            let customRoleData = JSON.parse(armorStand.getDynamicProperty(CustomRoleManager.CUSTOM_ROLES_SAVE_KEY));
            let highestID = 0;
            this.customRoles = customRoleData.map((roleData) => {
                let data = JSON.parse(roleData);
                highestID = Math.max(highestID, data.numericID);
                let customRole = CustomRole.loadCustomRoleData(data);
                RoleManager.addNewRole(customRole);
                return customRole;
            });
            CustomRole.customRoleNextID = highestID;
        }
    }

    static addCustomRole(customRole) {
        if (customRole == null) {
            return;
        }
        CustomRoleManager.customRoles.push(customRole);
        RoleManager.addNewRole(customRole);
        CustomRoleManager._saveToStand();
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Added new role " + customRole.roleCustomData.roleName));

        // RoleManager.addNewRole();
        // RoleManager.addNewRole(new CustomRole("dummy", "Dummy", "This is a test dummy role!", RoleAlignment.INNOCENT));
        //     system.run(() => {
        //     });
    }

    static _saveToStand() {
        let armorStand = SoundManager.getSoundSaveStand();
        if (armorStand == null) {
            if (world.getAllPlayers().length > 0) {
                world.getAllPlayers()[0].sendMessage("An error occured while saving custom roles. Please notify a dev.");
            }
            return;
        }

        // let saveArray = this.remainingRoles.map((preset) => JSON.stringify(preset));
        let rolesSaveString = JSON.stringify(CustomRoleManager.customRoles.map((r) => JSON.stringify(r.roleCustomData)));
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Saving string " + rolesSaveString));
        armorStand.setDynamicProperty(CustomRoleManager.CUSTOM_ROLES_SAVE_KEY, rolesSaveString);
    }

    /**
     * 
     * @param {Player} player 
     */
    static openCustomRoleMenu(player) {
        let form = new ActionFormData();

        form.title("Custom Roles");
        form.body("Here you can see any custom roles that you've added, and edit or remove them. Custom roles are dummy roles that do not have unique abilities.");
        
        let allCustomRoles = CustomRoleManager.customRoles;
        allCustomRoles.forEach((customRole) => {
            form.button(customRole.roleCustomData.roleName);
        })

        form.button("Create New Custom Roles");
        form.button("Import");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            if (r.selection < allCustomRoles.length) {
                // select preset menu
                CustomRoleManager._actionCustomRoleMenu(player, allCustomRoles[r.selection], r.selection);
                return;
            }
            if (r.selection == allCustomRoles.length) { // new preset
                CustomRoleManager._createCustomRoleMenu(player);
                return;
            }
            if (r.selection == allCustomRoles.length + 1) {
                CustomRoleManager._importCustomRole(player);
                return;
            }
            SettingsHandler.openGameSettings(player);
        });
    }

    /**
     * 
     * @param {Player} player 
     * @param {CustomRole} customRole 
     * @param {number} customRoleIndex 
     */
    static _actionCustomRoleMenu(player, customRole, customRoleIndex) {
        let form = new ActionFormData();
        form.title(customRole.roleCustomData.roleName + " Actions");
        form.body(customRole.roleCustomData.roleDescription);

        form.button("Edit Role Data");
        form.button("Export Custom Role");
        form.button("Delete Custom Role");
        form.button("Back");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            switch (r.selection) {
                case 0: // Edit
                    CustomRoleManager._editCustomRoleMenu(player, customRole, customRoleIndex);
                    return;
                case 1: // Export
                    CustomRoleManager._exportCustomRole(player, customRole, customRoleIndex);
                    // SettingsHandler._exportPresetMenu(player, customRole, customRoleIndex);
                    return;
                case 2: // Delete
                    CustomRoleManager._removeCustomRole(customRole);
                    CustomRoleManager.customRoles.splice(customRoleIndex, 1);
                    CustomRoleManager._saveToStand();
                    break;
                case 3: // Back
                    break;
            }

            CustomRoleManager.openCustomRoleMenu(player);
        });
    }

    /**
     * Removes a custom role from the RoleManager's list
     * @param {CustomRole} customRole
     */
    static _removeCustomRole(customRole) {
        let roleType = customRole.getRoleType();
        let roleIndex = RoleManager.allRoles.findIndex((r) => r.getRoleType() == roleType);
        RoleManager.allRoles.splice(roleIndex, 1);
        
        let subcategory = [];
        switch (customRole.getAlignment()) {
            case RoleAlignment.INNOCENT:
                subcategory = RoleManager.innocentRoles;
                break;
            case RoleAlignment.MURDERER:
                subcategory = RoleManager.murdererRoles;
                break;
            case RoleAlignment.NEUTRAL_INDEPENDENT:
                subcategory = RoleManager.neutralIRoles;
                break;
            case RoleAlignment.NEUTRAL_KILLER:
                subcategory = RoleManager.neutralKRoles;
                break;
            default:
                return;
        }
            
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Role alignment is " + customRole.getAlignment().display_name));
        roleIndex = subcategory.findIndex((r) => r.getRoleType().id == roleType.id && r.getRoleType().custom_id == roleType.custom_id);
        if (roleIndex > -1) {
            subcategory.splice(roleIndex, 1);
        }
    }

    /**
     * 
     * @param {Player} player 
     * @param {CustomRole} customRole 
     * @param {number} customRoleIndex 
     */
    static _editCustomRoleMenu(player, customRole, customRoleIndex) {
        let form = new ModalFormData();

        form.title(customRole.getDisplayName());
        form.divider();
        form.label("You can edit this preset here.");
        // 2
        let roleCustomData = customRole.roleCustomData;
        form.textField("Role Name", roleCustomData.roleName, {defaultValue: roleCustomData.roleName});
        form.textField("Role Description", roleCustomData.roleDescription, {defaultValue: roleCustomData.roleDescription, tooltip: "This appears when a player receives the role." });
        // player.sendMessage("" + roleCustomData.roleHelpDescription);
        form.textField("Role Help Description", roleCustomData.roleHelpDescription, {defaultValue: roleCustomData.roleHelpDescription, tooltip: "This appears when a player opens the help menu." });
        
        let alignments = [RoleAlignment.INNOCENT, RoleAlignment.NEUTRAL_INDEPENDENT, RoleAlignment.NEUTRAL_KILLER, RoleAlignment.MURDERER];
        form.dropdown("Role Alignment", alignments.map((a) => a.display_name), {defaultValueIndex: alignments.indexOf(roleCustomData.roleAlignment) });

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }
            
            CustomRoleManager._removeCustomRole(customRole);

            customRole.roleCustomData.roleName = r.formValues[2];
            customRole.roleCustomData.roleDescription = r.formValues[3];
            customRole.roleCustomData.roleHelpDescription = r.formValues[4];
            let roleAlignment = r.formValues[5];
            if (roleAlignment != customRole.roleCustomData.roleAlignment) {
                customRole.roleCustomData.roleAlignment = alignments[roleAlignment];
                customRole.roleCustomData.alignmentID = roleAlignment;
                // world.getAllPlayers().forEach((pl) => pl.sendMessage("Alignment id is " + customRole.roleCustomData.alignmentID));
            }

            RoleManager.addNewRole(customRole);

            CustomRoleManager._saveToStand();
            CustomRoleManager._actionCustomRoleMenu(player, customRole, customRoleIndex);
        });
    }

    static _importCustomRole(player) {
        try {
            let form = new CustomForm(player, "Import Custom Role");
            
            form.label("Import custom role here. These text boxes may only hold up to 5000 characters.");
            let stringOne = new ObservableString("", {clientWritable:true});
            form.textField("Import Field", stringOne);
            form.button("Submit", () => {
                let fullImport = stringOne.getData();
                // player.sendMessage(stringOne.getData());
                // player.sendMessage(fullImport);
                let jsonObj = JSON.parse(fullImport);

                let customRole = CustomRole.importCustomRole(jsonObj);
                if (customRole == null) {
                    player.sendMessage("Unable to create custom role. No custom data found.");
                }

                CustomRoleManager.addCustomRole(customRole);
                
                form.close();
            });
            form.closeButton();
            
            // player.sendMessage("Showing custom form");
            form.show();
        } catch (error) {
            player.sendMessage("There was an error, closing form.");
        }
    }

    /**
     * 
     * @param {Player} player 
     * @param {CustomRole} customRole 
     * @param {number} customRoleIndex 
     */
    static _exportCustomRole(player, customRole, customRoleIndex) {
        let form = new ModalFormData();
        form.title("Export " + customRole.roleCustomData.roleName);
        let exportValue = JSON.stringify(customRole.getDataForExport());
        form.divider();
        form.textField("Export String", "", {defaultValue: exportValue, tooltip: "Copy this and paste it when importing this custom role into a different world or when sharing!"});
        form.submitButton("Back");
        
        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            CustomRoleManager._actionCustomRoleMenu(player, customRole, customRoleIndex);
        });
    }

    static _createCustomRoleMenu(player) {
        let form = new ModalFormData();
        form.title("New Custom Role");
        form.divider();
        form.label("Here you can create a new custom role! First, what is the name of the custom role?");
        form.textField("Role Name", "Role Name Here");

        form.show(player).then((r) => {
            if (r.canceled) {
                return;
            }

            let roleName = r.formValues[2];
            let roleID = roleName.replace(" ", "_").toLowerCase();
            let newRole = new CustomRole(roleID, roleName, "Role Description", "Role Help Description", RoleAlignment.INNOCENT);
            CustomRoleManager.addCustomRole(newRole);
            CustomRoleManager._editCustomRoleMenu(player, newRole, CustomRoleManager.customRoles.length-1);
        });
    }
}