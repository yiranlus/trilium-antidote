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

module.exports = {
    getWebSocketPort,
    updateContent
}
