goog.provide('plugin.file.kml.KMLImporter');

goog.require('os.im.FeatureImporter');



/**
 * Imports a set of KML items
 *
 * @param {plugin.file.kml.KMLParser} parser The parser
 * @extends {os.im.FeatureImporter.<plugin.file.kml.ui.KMLNode>}
 * @constructor
 */
plugin.file.kml.KMLImporter = function(parser) {
  plugin.file.kml.KMLImporter.base(this, 'constructor', parser);

  /**
   * The last parsed KML root node
   * @type {plugin.file.kml.ui.KMLNode}
   * @private
   */
  this.rootNode_ = null;

  /**
   * Columns detected in the KML
   * @type {Array<!os.data.ColumnDefinition>}
   * @private
   */
  this.columns_ = null;

  /**
   * minimum refresh interval from the NetworkLinkControl
   * @type {number}
   * @private
   */
  this.minRefreshPeriod_ = 0;

  /**
   * Number of invalid polygons detected on import
   * @type {number}
   * @private
   */
  this.invalidCount_ = 0;
};
goog.inherits(plugin.file.kml.KMLImporter, os.im.FeatureImporter);


/**
 * @inheritDoc
 */
plugin.file.kml.KMLImporter.prototype.disposeInternal = function() {
  plugin.file.kml.KMLImporter.base(this, 'disposeInternal');
  this.rootNode_ = null;
};


/**
 * Get the root KML tree node.
 * @param {boolean=} opt_clear If the root node should be cleared on call.
 * @return {plugin.file.kml.ui.KMLNode}
 */
plugin.file.kml.KMLImporter.prototype.getRootNode = function(opt_clear = false) {
  var rootNode = this.rootNode_;
  if (opt_clear) {
    this.rootNode_ = null;
  }
  return rootNode;
};


/**
 * Get columns detected in the KML.
 *
 * @return {Array<!os.data.ColumnDefinition>}
 */
plugin.file.kml.KMLImporter.prototype.getColumns = function() {
  return this.columns_;
};


/**
 * Get columns detected in the KML.
 *
 * @return {number}
 */
plugin.file.kml.KMLImporter.prototype.getMinRefreshPeriod = function() {
  return this.minRefreshPeriod_;
};


/**
 * @inheritDoc
 */
plugin.file.kml.KMLImporter.prototype.onParserReady = function(opt_event) {
  // if a KML tree was previously parsed, set it on the parser so the tree is merged
  this.parser.setRootNode(this.rootNode_);

  plugin.file.kml.KMLImporter.base(this, 'onParserReady', opt_event);
};


/**
 * @inheritDoc
 */
plugin.file.kml.KMLImporter.prototype.onParsingComplete = function(opt_event) {
  // grab the newly parsed KML tree before it's removed by parser cleanup
  this.rootNode_ = this.parser.getRootNode();
  this.columns_ = this.parser.getColumns();
  this.minRefreshPeriod_ = this.parser.getMinRefreshPeriod();

  if (this.invalidCount_ > 0) {
    var msg = this.invalidCount_ === 1 ? 'An area was' : (this.invalidCount_ + ' areas were');
    os.alertManager.sendAlert(msg + ' removed from the original due to invalid topology. One possible ' +
        ' reason is a repeating or invalid coordinate.',
    os.alert.AlertEventSeverity.WARNING);
  }

  plugin.file.kml.KMLImporter.base(this, 'onParsingComplete', opt_event);
};


/**
 * @inheritDoc
 */
plugin.file.kml.KMLImporter.prototype.sanitize = function(item) {
  var feature = null;
  if ((item instanceof os.ui.slick.SlickTreeNode) && (item.getFeature())) {
    feature = /** @type {ol.Feature} */ (item.getFeature());
  }

  if (feature) {
    this.invalidCount_ += os.feature.validateGeometries(feature, false);
    plugin.file.kml.KMLImporter.base(this, 'sanitize', feature);
  }
};


/**
 * @inheritDoc
 */
plugin.file.kml.KMLImporter.prototype.performMappings = function(item) {
  var feature = null;
  if (item.getFeature()) {
    feature = /** @type {ol.Feature} */ (item.getFeature());
  }

  if (feature && (this.mappings || this.autoMappings)) {
    plugin.file.kml.KMLImporter.base(this, 'performMappings', feature);

    // line dash isn't part of kml spec, translate it here
    var lineDash = /** @type {string} */ (feature.get(os.style.StyleField.LINE_DASH));
    if (lineDash) {
      var dash = /** @type {Array<number>} */ (JSON.parse(lineDash));
      var config = os.style.getBaseFeatureConfig(feature);
      os.style.setConfigLineDash(config, dash);
      feature.set(os.style.StyleType.FEATURE, config);
    }
  }
};
