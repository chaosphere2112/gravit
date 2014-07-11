(function (_) {
    /**
     * A base editor for an image
     * @param {IFImage} image the image this editor works on
     * @class IFImageEditor
     * @extends IFShapeEditor
     * @constructor
     */
    function IFImageEditor(image) {
        IFShapeEditor.call(this, image);
        this._flags |= IFBlockEditor.Flag.ResizeAll;
    };
    IFObject.inherit(IFImageEditor, IFShapeEditor);
    IFElementEditor.exports(IFImageEditor, IFImage);

    /** @override */
    IFImageEditor.prototype.initialSetup = function () {
        // Nothing to do as image has no style by default
    };

    /** @override */
    IFImageEditor.prototype.toString = function () {
        return "[Object IFImageEditor]";
    };

    _.IFImageEditor = IFImageEditor;
})(this);