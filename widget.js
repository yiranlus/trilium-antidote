import { defineWidget, useActiveNoteContext, useNoteProperty } from "trilium:preact";
// for Antidote Connectix Agent
import { ConnectixAgent, WordProcessorAgent, WordProcessorAgentTextArea } from "antidote.js";
import { retrieveText, selectInterval, applyCorrection } from "antidote.js";
// for Antidote Connector
import { AntidoteConnector, Antidote } from "antidote.js";

import { getWebSocketPort, updateContent, groupHTMLElements } from "utils.js";

class WordProcessAgentTextNote extends WordProcessorAgent {
    constructor(note, elements) {
        super();
        this.note = note;
        this.originalElements = elements;
        this.fieldsToCorrect = elements.map(el => {
            if (el.classList.contains("zone-pre")) {
                const clone = document.createElement("div");
                clone.classList.add("zone-pre");
                clone.classList.add("zone-readonly");
                const span = document.createElement("span");
                span.textContent = "{{code}}";
                clone.appendChild(span);

                return clone;
            } else if (el.classList.contains("zone-figure")) {
                const clone = document.createElement("div");
                clone.classList.add("zone-figure");
                
                const span = document.createElement("span");
                clone.appendChild(span);

                const figureCaption = el.querySelector("figcaption");
                if (figureCaption) {
                    span.textContent = "{{figure}}: ";
                    
                    const caption = document.createElement("div");
                    caption.className = "zone-figcaption";
                    caption.innerHTML = figureCaption.innerHTML;

                    clone.appendChild(caption);
                } else {
                    span.textContent = "{{figure}}";
                    clone.classList.add("zone-readonly");
                }

                return clone;
            } else if (el.classList.contains("zone-section")) {
                const clone = document.createElement("div");
                clone.classList.add("zone-section");
                clone.classList.add("zone-readonly");
                const span = document.createElement("span");
                span.textContent = "{{included note}}";
                clone.appendChild(span);

                return clone;
            }

            const clone = el.cloneNode(true);
            return clone;
        });
    }

    sessionStarted() {
        this.wrapDiv = document.createElement('div');
        this.wrapDiv.style.display = 'none';
        this.wrapDiv.append(...this.fieldsToCorrect);
        document.body.appendChild(this.wrapDiv);
        
        super.sessionStarted();
    }

    sessionEnded() {
        document.body.removeChild(this.wrapDiv);
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
        if (ret) {
            const newContent = this.originalElements.map((div, index) => {
                if (div.classList.contains("zone-figure") &&
                    !div.classList.contains("zone-readonly")) {
                    const figCaption = div.querySelector("figcaption");

                    const caption = this.fieldsToCorrect[index].querySelector(".zone-figcaption");

                    figCaption.innerHTML = caption.innerHTML;

                    return div.innerHTML;
                } else if (div.classList.contains("zone-pre") ||
                           div.classList.contains("zone-section")) {
                    return div.innerHTML;
                }
                
                return this.fieldsToCorrect[index].innerHTML;
            }).join("");
            updateContent(this.note.noteId, newContent);
            return true;
        }
        
        return false;
    }

    allowEdit(params) {
        const fieldToCorrect = this.fieldsToCorrect[Number(params.zoneId)];
        if (fieldToCorrect.classList.contains("zone-readonly")) {
            return false;
        }
        
        if (fieldToCorrect.classList.contains("zone-figure") &&
            params.positionStart <= "{{figure}}: ".length+1) {
            return false;
        }
        
        const text = retrieveText(fieldToCorrect);
        return text.substring(params.positionStart, params.positionEnd) == params.context;
    }

    selectInterval(params) {
        const fieldToCorrect = this.fieldsToCorrect[Number(params.zoneId)];
        selectInterval(fieldToCorrect, params.positionStart, params.positionEnd);
    }

    zonesToCorrect(_params) {
        return this.fieldsToCorrect.map(function(value, index) {
            return {
                text: (value.classList.contains("zone-code")? "{{code}}": retrieveText(value)),
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
        console.log(note);
        const noteType = useNoteProperty(note, "type");

        const detectContector = () => {
            note.getContent()
            .then(content => {
                const elements = groupHTMLElements(content);
                if (elements.length === 0)
                    throw new Error("content is empty.");
                
                AntidoteConnector.announcePresence();
                console.log("AntidoteConnector: ", AntidoteConnector);
                console.log("Antidote Connector Enabled: ", AntidoteConnector.isDetected());

                    return new ConnectixAgent(
                        new WordProcessAgentTextNote(note, elements, content), getWebSocketPort
                    )

                if (AntidoteConnector.isDetected()) {
                    // use Antidote Connector
                    return new ConnectixAgent(
                        new WordProcessAgentTextNote(note, elements),
                        AntidoteConnector.getWebSocketPort
                    )
                } else {
                    // use Antidote Connectix
                    console.log("use Antidote Connectix");

                    return new ConnectixAgent(
                        new WordProcessAgentTextNote(note, elements),
                        getWebSocketPort
                    )
                }
            })
            .then(agent => agent.connectWithAntidote().then(() => agent))
            .then(agent => agent.launchCorrector())
            .catch(error => api.showMessage(error));
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
