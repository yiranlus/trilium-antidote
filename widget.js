import { defineWidget, useActiveNoteContext, useNoteProperty } from "trilium:preact";
import { ConnectixAgent, WordProcessorAgent } from "antidote.js";
import { retrieveText, selectInterval, applyCorrection } from "antidote.js";
import { getWebSocketPort, updateContent } from "utils.js";

class WordProcessAgentTextNote extends WordProcessorAgent {
    constructor(note, contentDiv) {
        super();
        this.note = note;
        this.contentDiv = contentDiv;
    }

    sessionStarted() {
        super.sessionStarted();
        
        document.body.appendChild(this.contentDiv);
    }

    sessionEnded() {
        const noteId = this.note.noteId;
        const newContent = this.contentDiv.innerHTML;
        
        document.body.removeChild(this.contentDiv);
        this.contentDiv = null;
        
        super.sessionEnded();

        updateContent(noteId, newContent);
    }

    configuration() {
        return {
            documentTitle: this.note.title,
        };
    }

    correctIntoWordProcessor(params) {
        if (params.zoneId !== this.note.noteId) return;
        
        const rangeToCorrect = {
            start: params.positionStartReplace,
            end: params.positionReplaceEnd,
            string: params.newString
        };
        return applyCorrection(this.contentDiv, rangeToCorrect);
    }

    allowEdit(params) {
        if (params.zoneId !== this.note.noteId) return;
        const text = retrieveText(this.contentDiv);
        return text.substring(params.positionStart, params.positionEnd) == params.context;
    }

    selectInterval(params) {
        if (params.zoneId !== this.note.noteId) return;
        selectInterval(this.contentDiv, params.positionStart, params.positionEnd);
    }

    zonesToCorrect(_params) {
        return [{
            text: retrieveText(this.contentDiv),
            zoneId: this.note.noteId,
            zoneIsFocused: false
        }];
    }
}

export default defineWidget({
    parent: "center-pane",
    render: () => {
        const { note, noteContext } = useActiveNoteContext();
        const noteType = useNoteProperty(note, "type");

        const detectContector = () => {
            note.getContent()
            .then(content => {
                const tempDiv = document.createElement('div');
                tempDiv.style.display = 'none';
                tempDiv.innerHTML = content;
                
                return new ConnectixAgent(
                    new WordProcessAgentTextNote(note, tempDiv), getWebSocketPort
                )
            })
            .then(agent => agent.connectWithAntidote().then(() => agent))
            .then(agent => agent.launchCorrector())
            .catch(error => console.log(error));
        }
        
        return (
            <div style={{ display: noteType==="text"?"flex":"none" }}>
                <button id="antidote-corrector" onClick={detectContector}>
                    <i class="bx bxs-flask"/>
                </button>
            </div>
        );
    }
});
