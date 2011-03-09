function(doc) {
  if (doc.type == 'item') {
    emit(doc.feed, doc);
  }
};