"use strict";

export class Preset {
    /**
     * 
     * @param {string} presetName 
     * @param {string} presetDescription 
     * @param {string} presetDefinition
     * @param {number} presetType  
     */
    constructor(presetName, presetDescription, presetDefinition, presetType) {
        this.presetName = presetName;
        this.presetDescription = presetDescription;
        this.presetDefinition = presetDefinition;
        this.presetType = presetType;
    }
}