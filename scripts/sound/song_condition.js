"use strict";

import { world, system, Player } from "@minecraft/server";

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Role, RoleAlignment } from "../role";

export class SongCondition {

    /**
     * Creates a new song condition.
     * @param {string} definition the string that contains the definition. If empty creates a default condition.
    */
   constructor(definition) {
        if (definition == "" || definition == null) {
            this.conditionType = ConditionType.TOTAL_PLAYER_COUNT;
            this.comparisonType = ComparisonTypes.AT_LEAST;
            this.alignmentType = AlignmentTypes.INNOCENT;
            this.number = 0;
            this.setup = true;
            return;
        }

        this.setup = false;
        let cleanDefinition = definition.replace(" ", "");

        let conditionParsed = SongCondition._parseConditionType(cleanDefinition);
        if (conditionParsed.length <= 0) {
            system.run(() => {
                world.sendMessage("Error parsing song condition: condition type is invalid in string " + definition);
            });
            return;
        }

        this.conditionType = conditionParsed[0];

        let comparisonParsed = SongCondition._parseComparisonType(conditionParsed[1]);
        if (comparisonParsed.length <= 0) {
            system.run(() => {
                world.sendMessage("Error parsing song condition: comparison type is invalid in string " + definition) ;
            });
            return;
        }
        this.comparisonType = comparisonParsed[0];
        this.number = 0;
        this.alignmentType = AlignmentTypes.INNOCENT;

        if (this.conditionType == ConditionType.ALIGNMENT) {
            let alignmentParsed = SongCondition._parseAlignmentType(comparisonParsed[1]);
            
            if (alignmentParsed.length <= 0) {
                system.run(() => {
                    world.sendMessage("Error parsing song condition: alignment type is invalid in string " + definition) ;
                });
                return;
            }
            this.alignmentType = alignmentParsed[0];
        }
        else {
            let remaining = comparisonParsed[1];
            let parsedNumber = parseInt(remaining);
            
            if (parsedNumber == NaN) {
                system.run(() => {
                    world.sendMessage("Error parsing song condition: number is invalid in string " + definition);
                })
                return; 
            }

            this.number = parsedNumber;
        }

        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Comparison type parsed is " + this.comparisonType.symbol));
        this.setup = true;
    }

    /**
     * Converts this condition to a save format
     * @returns {string}
     */
    convertToSave() {
        let data = "";
        data += this.conditionType.symbol;
        data += this.comparisonType.symbol;
        if (this.conditionType == ConditionType.ALIGNMENT) {
            data += this.alignmentType.symbol;
        }
        else {
            data += this.number.toString();
        }
        return data;
    }

    toString() {
        let value = "";
        value += this.conditionType.string;
        value += " " + this.comparisonType.symbol + " ";

        if (this.conditionType == ConditionType.ALIGNMENT) {
            value += this.alignmentType.string;
        }
        else {
            value += this.number.toString();
        }

        return value;
    }

    /**
     * 
     * @param {string} string the string to parse
     * @returns {Array} a 2 part array, returning a ConditionType and the remaining string
     */
    static _parseConditionType(string) {
        if (string.startsWith("m")) {
            return [ConditionType.MURDERER_COUNT, string.substring(1)];
        }
        if (string.startsWith("a")) {
            return [ConditionType.ALIGNMENT, string.substring(1)];
        }
        if (string.startsWith("c")) {
            return [ConditionType.TOTAL_PLAYER_COUNT, string.substring(1)];
        }
        if (string.startsWith("p")) {
            return [ConditionType.LIVING_PLAYER_COUNT, string.substring(1)];
        }
        if (string.startsWith("l")) {
            return [ConditionType.PERCENT_PLAYERS_LEFT, string.substring(1)];
        }
        return [];
    }

    /**
     * 
     * @param {string} string the string to parse
     * @returns {Array} a 2 part array, returning a ComparisonType and the remaining string
     */
    static _parseComparisonType(string) {
        if (string.startsWith("<=")) {
            return [ComparisonTypes.AT_MOST, string.substring(2)];
        }
        if (string.startsWith("<")) {
            return [ComparisonTypes.LESS_THAN, string.substring(1)];
        }
        if (string.startsWith("=")) {
            return [ComparisonTypes.EQUALS, string.substring(1)];
        }
        if (string.startsWith(">=")) {
            return [ComparisonTypes.AT_LEAST, string.substring(2)];
        }
        if (string.startsWith(">")) {
            return [ComparisonTypes.GREATER_THAN, string.substring(1)];
        }
        if (string.startsWith("!=")) {
            return [ComparisonTypes.NOT_EQUAL, string.substring(2)];
        }
        return [];
    }

    /**
     * 
     * @param {string} string the string to parse
     * @returns {Array} a 2 part array, returning a ConditionType and the remaining string
     */
    static _parseAlignmentType(string) {
        if (string.startsWith("m")) {
            return [AlignmentTypes.MURDERER, string.substring(1)];
        }
        if (string.startsWith("i")) {
            return [AlignmentTypes.INNOCENT, string.substring(1)];
        }
        if (string.startsWith("nk")) {
            return [AlignmentTypes.NEUTRAL_KILLER, string.substring(2)];
        }
        if (string.startsWith("ni")) {
            return [AlignmentTypes.NEUTRAL_INDEPENDENT, string.substring(2)];
        }
        return [];
    }

    /**
     * Returns whether this condition is true.
     * @param {*} murdererCount 
     * @param {RoleAlignment} playerAlignment 
     * @param {*} totalPlayers 
     * @param {*} currentPlayers 
     */
    isMet(murdererCount, playerAlignment, totalPlayers, currentPlayers) {
        let comparisonType = this.comparisonType;
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Checking condition is met of type " + comparisonType.symbol));
        switch (this.conditionType) {
            case ConditionType.MURDERER_COUNT:
                return SongCondition._compare(murdererCount, this.number, comparisonType);
            case ConditionType.ALIGNMENT:
                return SongCondition._alignmentsMatch(playerAlignment, this.alignmentType, comparisonType);
            case ConditionType.LIVING_PLAYER_COUNT:
                return SongCondition._compare(currentPlayers, this.number, comparisonType);
            case ConditionType.TOTAL_PLAYER_COUNT:
                return SongCondition._compare(totalPlayers, this.number, comparisonType);
            case ConditionType.PERCENT_PLAYERS_LEFT:
                return SongCondition._compare(currentPlayers * 100 / totalPlayers, this.number, comparisonType);
        }
        return false;
    }

    static _compare(numOne, numTwo, comparisonType) {
        // world.getAllPlayers().forEach((pl) => pl.sendMessage("Comparing " + numOne + " to " + numTwo + " using comparison " + comparisonType.symbol));
        switch (comparisonType) {
            case (ComparisonTypes.LESS_THAN):
                return numOne < numTwo;
            case (ComparisonTypes.AT_MOST):
                return numOne <= numTwo;
            case (ComparisonTypes.EQUALS):
                return numOne = numTwo;
            case (ComparisonTypes.GREATER_THAN):         
                return numOne > numTwo;
            case (ComparisonTypes.AT_LEAST):
                return numOne >= numTwo;
            case (ComparisonTypes.NOT_EQUAL):
                return numOne != numTwo;
        }
        return false;
    }

    /**
     * Returns if the two alignments match
     * @param {RoleAlignment} alignment 
     * @param {AlignmentTypes} alignmentType 
     * @param {ComparisonTypes} comparisonType
     */
    static _alignmentsMatch(alignment, alignmentType, comparisonType) {
        if (typeof(alignment) == typeof(true)) {
            return alignment;
        }
        let compareType = SongCondition._alignmentTypeToRoleAlignment(alignmentType);
        // system.run(() => {
        //     world.getAllPlayers()[0].sendMessage("Comparison type is " + comparisonType.symbol);
        // });
        if (comparisonType == ComparisonTypes.NOT_EQUAL) {
            return alignment.description != compareType.description;
        }
        return alignment.description == compareType.description;
    }

    static _alignmentTypeToRoleAlignment(alignmentType) {
        switch (alignmentType) {
            case (AlignmentTypes.MURDERER):
                return RoleAlignment.MURDERER;
            case (AlignmentTypes.NEUTRAL_INDEPENDENT):
                return RoleAlignment.NEUTRAL_INDEPENDENT;
            case (AlignmentTypes.NEUTRAL_KILLER):
                return RoleAlignment.NEUTRAL_KILLER;
            default:
                return RoleAlignment.INNOCENT;
        }
    }
}

export const ConditionType = Object.freeze({
    MURDERER_COUNT: {id: 0, symbol: "m", string: "Murderer Count"},
    ALIGNMENT: {id: 1, symbol: "a", string: "Alignment"},
    TOTAL_PLAYER_COUNT: {id: 2, symbol: "c", string: "Total Player Count"},
    LIVING_PLAYER_COUNT: {id: 3, symbol: "p", string: "Living Player Count"},
    PERCENT_PLAYERS_LEFT: {id: 4, symbol: "l", string: "Percentage of Players Left"}
});

export const ComparisonTypes = Object.freeze({
    LESS_THAN: {symbol: "<"},
    AT_MOST: {symbol: "<="},
    EQUALS: {symbol: "="},
    NOT_EQUAL: {symbol: "!="},
    GREATER_THAN: {symbol: ">"},
    AT_LEAST: {symbol: ">="}
});

export const AlignmentTypes = Object.freeze({
    MURDERER: {symbol:"m", string: "Murderer"},
    INNOCENT: {symbol:"i", string: "Innocent"},
    NEUTRAL_KILLER: {symbol:"nk", string: "Neutral Killer"},
    NEUTRAL_INDEPENDENT: {symbol:"ni", string: "Neutral Independent"}
});