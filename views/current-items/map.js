function(doc) {
  if (doc.type == 'item' && doc.current) {
    emit(doc.feed, doc);
  }
};