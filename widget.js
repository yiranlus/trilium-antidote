import { defineWidget, useActiveNoteContext, useNoteProperty, useTextEditor } from "trilium:preact";
// for Antidote Connectix Agent
import { ConnectixAgent, WordProcessorAgent, WordProcessorAgentTextArea } from "antidote.js";
import { retrieveText, selectInterval, applyCorrection } from "antidote.js";
// for Antidote Connector
import { AntidoteConnector } from "antidote.js";

import { getWebSocketPort, updateContent, getHTMLElements } from "utils.js";

class WordProcessAgentTextNote extends WordProcessorAgent {
    constructor(note, fieldsToCorrect, editor) {
        super();
        this.note = note;
        this.editor = editor;
        this.fieldsToCorrect = fieldsToCorrect;
    }

    sessionStarted() {
        this.wrapDiv = document.createElement('div');
        this.wrapDiv.style.display = 'none';
        this.wrapDiv.append(...this.fieldsToCorrect);
        document.body.appendChild(this.wrapDiv);

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                const node = mutation.target.parentNode;
                const fragment = node.closest(".zone-fragment");

                try {
                    const id = fragment.id;
                    const index = parseInt(id.substring(id.lastIndexOf('-') + 1), 10);
                    console.log("fragment: ", fragment);

                    const editor = this.editor;
                    editor.model.change(writer => {
                        const root = editor.model.document.getRoot();
                        const childElement = root.getChild(index);

                        if (fragment.classList.contains("fragment-paragraph") ||
                            fragment.classList.contains("fragment-heading1") ||
                            fragment.classList.contains("fragment-heading2") ||
                            fragment.classList.contains("fragment-heading3") ||
                            fragment.classList.contains("fragment-heading4") ||
                            fragment.classList.contains("fragment-heading5") ||
                            fragment.classList.contains("fragment-heading6")) {
                            const modelFragment = editor.data.parse(fragment.innerHTML);

                            writer.remove(writer.createRangeIn(childElement));
                            const firstChild = modelFragment.getChild(0);
                            
                            if (firstChild && firstChild.is('element', 'paragraph')) {
                                const nodesToInsert = Array.from(firstChild.getChildren());
                                writer.insert(nodesToInsert, childElement, 0);
                            } else {
                                writer.insert(Array.from(modelFragment.getChildren()), childElement, 0);
                            }
                        } else if (fragment.classList.contains("fragment-figcaption")) {
                            const clone = fragment.cloneNode(true);
                            clone.removeChild(clone.firstElementChild);
                            
                            const modelFragment = editor.data.parse(clone.innerHTML);
                            const firstChild = modelFragment.getChild(0);

                            const caption = childElement.getChildren().find(
                                child => child.is("element", "caption")
                            );
                            
                            if (caption) {
                                writer.remove(writer.createRangeIn(caption));
                                const firstChild = modelFragment.getChild(0);
                                
                                if (firstChild && firstChild.is('element', 'paragraph')) {
                                    // If it's a paragraph, we take its children (text, strong, etc.)
                                    const nodesToInsert = Array.from(firstChild.getChildren());
                                    writer.insert(nodesToInsert, caption, 0);
                                } else {
                                    writer.insert(Array.from(modelFragment.getChildren()), caption, 0);
                                }
                            }
                        } else if (fragment.classList.contains("fragment-aside") ||
                                   fragment.classList.contains("fragment-block-quote")) {
                            const modelFragment = editor.data.parse(fragment.innerHTML);

                            writer.remove(writer.createRangeIn(childElement));
                            writer.insert(Array.from(modelFragment.getChildren()), childElement, 0);
                        }
                    });
                } catch(error) {
                    console.log(error);
                }
            }
        });

        this.observer.observe(this.wrapDiv, { 
            characterData: true, 
            subtree: true, 
            childList: true 
        });
        
        super.sessionStarted();
    }

    sessionEnded() {
        document.body.removeChild(this.wrapDiv);
        this.observer.disconnect();
        this.wrapDiv.remove();
        this.wrapDiv = null;
        
        super.sessionEnded();
    }

    configuration() {
        return {
            documentTitle: this.note.title
        };
    }

    correctIntoWordProcessor(params) {
        const fieldToCorrect = this.fieldsToCorrect[Number(params.zoneId)];
        const rangeToCorrect = {
            start: params.positionStartReplace,
            end: params.positionReplaceEnd,
            string: params.newString
        };

        const ret = applyCorrection(fieldToCorrect, rangeToCorrect);
        return true;
    }

    allowEdit(params) {
        const fieldToCorrect = this.fieldsToCorrect[Number(params.zoneId)];
        if (fieldToCorrect.classList.contains("zone-readonly")) {
            return false;
        }
        
        if (fieldToCorrect.classList.contains("zone-figure") &&
            params.positionStart <= 17) {
            return false;
        }

        return true;
        // const text = retrieveText(fieldToCorrect);
        // return text.substring(params.positionStart, params.positionEnd) == params.context;
    }

    selectInterval(params) {
        const fieldToCorrect = this.fieldsToCorrect[Number(params.zoneId)];
        selectInterval(fieldToCorrect, params.positionStart, params.positionEnd);
    }

    zonesToCorrect(_params) {
        return this.fieldsToCorrect.map(function(value, index) {
            console.log(retrieveText(value));
            return {
                text: retrieveText(value),
                zoneId: index.toString(),
                zoneIsFocused: index == 0
            };
        });
    }
}

export default defineWidget({
    parent: "center-pane",
    render: () => {
        const { note, noteContext } = useActiveNoteContext();
        const editor = useTextEditor(noteContext);
        const noteType = useNoteProperty(note, "type");

        const launchCorrector = () => {
            const elements = getHTMLElements(note.noteId, editor);
            if (elements.length === 0)
                throw new Error("content is empty.");
            
            AntidoteConnector.announcePresence();
            api.log("Antidote Connector Enabled: ", AntidoteConnector.isDetected());

            const agent = new ConnectixAgent(
                new WordProcessAgentTextNote(note, elements, editor),
                AntidoteConnector.isDetected() ?
                AntidoteConnector.getWebSocketPort :
                getWebSocketPort
            );
            
            agent.connectWithAntidote()
            .then(() => agent.launchCorrector())
            .catch(error => api.showMessage(error));
        }
        
        return (
            <div style={{ display: noteType==="text"?"flex":"none" }}>
                <button id="antidote-corrector" onClick={launchCorrector}>
                    <i class="bx bxs-flask"/>
                </button>
            </div>
        );
    }
});
