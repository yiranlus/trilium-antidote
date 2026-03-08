function getWebSocketPort() {
    return api.searchForNote("#antidotePort")
    .then(note => {
        return note.getLabelValue("antidotePort")
    })
}

function updateContent(noteId, content) {
    return api.runOnBackend((noteId, content) => {
        console.log("final content: ", noteId, content);
        
        const note = api.getNote(noteId);
        note.setContent(content);
        note.save();
    }, [noteId, content]);
}

function groupHTMLElements(htmlElements) {
    const resultContainers = [];
    let currentGroup = [];

    const flushGroup = () => {
        if (currentGroup.length > 0) {
            const div = document.createElement('div');
            currentGroup.forEach(node => div.appendChild(node.cloneNode(true)));
            resultContainers.push(div);
            currentGroup = [];
        }
    };
    
    Array.from(htmlElements).forEach(node => {
        const isSpecial = node.nodeType === 1 && 
                     !(node.classList.contains("fragment-paragraph") ||
                       node.classList.contains("fragment-heading1") ||
                       node.classList.contains("fragment-heading2") ||
                       node.classList.contains("fragment-heading3") ||
                       node.classList.contains("fragment-heading4") ||
                       node.classList.contains("fragment-heading5") ||
                       node.classList.contains("fragment-heading6"));

        if (isSpecial) {   
            flushGroup();

            const specialDiv = document.createElement('div');

            if (!(node.classList.contains("fragment-figcaption") ||
                  node.classList.contains("fragment-aside") ||
                  node.classList.contains("fragment-block-quote"))) {
                specialDiv.classList.add("zone-readonly");
            }

            if (node.classList.contains("fragment-figcaption")) {
                specialDiv.classList.add("zone-figure");
            }
            
            specialDiv.appendChild(node.cloneNode(true));
            resultContainers.push(specialDiv);
        } else {
            currentGroup.push(node);
        }
    });

    flushGroup();

    return resultContainers;
}

function getHTMLElements(noteId, editor) {
    const htmlElements = Array.from(
        editor.model.document.getRoot().getChildren().map((element, index) => {
            if (element.name === "paragraph" ||
                element.name.startsWith("heading")) {
                const p = document.createElement("p");
                p.id = `${noteId}-fragment-${index}`;
                p.classList.add(`fragment-${element.name}`);
                p.classList.add("zone-fragment");
                
                p.innerHTML = editor.data.stringify(element);
                return p;
            } else if (element.name === "imageBlock" ||
                       element.name === "table") {
                const p = document.createElement("p");
                p.id = `${noteId}-fragment-${index}`;
                p.classList.add(`fragment-figure`);
                p.classList.add("zone-fragment");

                const caption = element.getChildren().find(
                    child => child.is("element", "caption")
                );
                if (caption) {
                    p.classList.add("fragment-figcaption");
                    p.innerHTML = `<span>{{figure}}: </span>${editor.data.stringify(caption)}`;
                } else {
                    p.innerHTML = `<span>{{figure}}</span>`;
                }
                return p;
            } else if (element.name === "codeBlock") {
                const p = document.createElement("p");
                p.classList.add("fragment-code");
                p.classList.add("zone-fragment");
                p.innerHTML = "{{code}}";
                return p;
            } else if (element.name === "aside" ||
                       element.name === "blockQuote") {
                const div = document.createElement("div");
                div.id = `${noteId}-fragment-${index}`;
                if (element.name === "aside") {
                    div.classList.add("fragment-aside");
                } else {
                    div.classList.add("fragment-block-quote");
                }
                div.classList.add("zone-fragment");
                div.innerHTML = editor.data.stringify(element);
                return div;
            }
            
            const p = document.createElement("p");
            p.textContent = `{{${element.name}}}`;
            p.classList.add("fragment-unsupported");
            p.classList.add("zone-fragment");
            return p;
        })
    );

    return groupHTMLElements(htmlElements);
}

module.exports = {
    getWebSocketPort,
    updateContent,
    groupHTMLElements,
    getHTMLElements
}
