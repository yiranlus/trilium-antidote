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

function groupHTMLElements(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

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
    
    Array.from(body.childNodes).forEach(node => {
        const isSpecial = node.nodeType === 1 && 
                     (node.tagName === 'PRE' || node.tagName === 'FIGURE' || node.tagName === 'SECTION');

        if (isSpecial) {   
            flushGroup();

            const specialDiv = document.createElement('div');
            if (node.tagName === 'PRE') {
                specialDiv.classList.add("zone-pre");
            } else if (node.tagName === 'FIGURE') {
                specialDiv.classList.add("zone-figure");
            } else if (node.tagName === 'SECTION') {
                specialDiv.classList.add("zone-section");
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

module.exports = {
    getWebSocketPort,
    updateContent,
    groupHTMLElements
}
