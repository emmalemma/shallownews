function(doc) {
  if (doc.type == 'feed') {
    emit(doc.title, doc);
  }
};