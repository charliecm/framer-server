(function() {
  var layer, layerName, layers;

  layers = Framer.Importer.load('imported/sample');

  for (layerName in layers) {
    layer = layers[layerName];
    layer.on(Events.Click, function(event, layer) {
      layer.scale = 0.7;
      layer.animate({
        properties: {
          scale: 1.0
        },
        curve: 'spring',
        curveOptions: {
          friction: 15,
          tension: 1000
        }
      });
      return event.stopPropagation();
    });
  }

}).call(this);

//# sourceMappingURL=app.js.map
