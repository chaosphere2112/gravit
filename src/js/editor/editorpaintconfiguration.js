(function (_) {
    /**
     * A paint configuration for editor painting
     * @class GEditorPaintConfiguration
     * @constructor
     * @extends GScenePaintConfiguration
     */
    function GEditorPaintConfiguration() {
    }

    GObject.inherit(GEditorPaintConfiguration, GScenePaintConfiguration);

    /**
     * Whether to render pages or not
     * @type {Boolean}
     */
    GEditorPaintConfiguration.prototype.pagesVisible = true;

    /**
     * Whether to render the grid or not if it is active
     * @type {Boolean}
     */
    GEditorPaintConfiguration.prototype.gridVisible = true;

    /** @override */
    GEditorPaintConfiguration.prototype.toString = function () {
        return "[Object GEditorPaintConfiguration]";
    };

    _.GEditorPaintConfiguration = GEditorPaintConfiguration;
})(this);