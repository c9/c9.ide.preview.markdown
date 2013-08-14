define(function(require, exports, module) {
    main.consumes = ["plugin", "menus", "preview", "tabs", "ui"];
    main.provides = ["preview.markdown"];
    return main;

    function main(options, imports, register) {
        var Plugin   = imports.plugin;
        var preview  = imports.preview;
        var tabs     = imports.tabs;
        var ui       = imports.ui;
        var menus    = imports.menus;
        // var Menu     = menus.Menu;
        var MenuItem = menus.MenuItem;
        var Divider  = menus.Divider;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        // var emit   = plugin.getEmitter();
        
        const HTMLURL = options.htmlurl || location.protocol + "//" 
            + location.host + "/static/plugins/c9.ide.preview.markdown/index.html"
        
        var loaded = false;
        function load(){
            if (loaded) return false;
            loaded = true;
            
            preview.register(plugin, function(path){
                return path.match(/(?:\.md|\.markdown)$/i);
            });
            
            var menu = preview.previewMenu;
            menu.append(new MenuItem({ 
                caption  : "Markdown", 
                position : 200,
                onclick  : function(){
                    // The menu can only be shown if the previewer has focus
                    var editor = tabs.focussedPage.editor;
                    editor.setPreviewer("preview.markdown");
                }
            }));
        }
        
        /***** Methods *****/
        
        function loadDocument(doc, preview){
            var session = doc.getSession();
            var page    = doc.page;
            
            var iframe = document.createElement("iframe");
            iframe.style.width    = "100%";
            iframe.style.height   = "100%";
            iframe.style.border   = 0;
            iframe.style.backgroundColor = "rgba(255, 255, 255, 0.88)";
            
            session.iframe = iframe;
            preview.container.appendChild(session.iframe);
            
            window.addEventListener("message", function(e){
                // if (event.origin !== "http://example.org:8080")
                //     return;
                
                if (e.data.message == "stream.document") {
                    session.source = e.source;
                    session.source.postMessage({
                        type    : "document",
                        content : session.previewPage.document.value
                    }, location.origin);
                    
                    page.className.remove("loading");
                }
            }, false);
            
            // Load the markup renderer
            iframe.src = HTMLURL;
            
            session.on("navigate", function(e){
                page.className.add("loading");
                
                page.title    = 
                page.tooltip  = "[M] " + e.url;
                preview.getElement("txtPreview").setValue(e.url);
                
                iframe.src = iframe.src;
            }, session);
            session.on("update", function(e){
                if (!session.source) return; // Renderer is not loaded yet
                
                session.source.postMessage({
                    type    : "document",
                    content : session.previewPage.document.value
                }, location.origin);
            }, session);
            session.on("reload", function(e){
                page.className.add("loading");
                iframe.src = iframe.src;
            }, session);
            session.on("activate", function(){
                session.iframe.style.display = "block";
                preview.getElement("txtPreview").setValue(session.path);
                preview.getElement("btnMode").setCaption("Markdown");
                preview.getElement("btnMode").setIcon("page_white.png");
            }, session);
            session.on("deactivate", function(){
                session.iframe.style.display = "none";
            }, session);
        }
        
        function unloadDocument(doc){
            var session = doc.getSession();
            var iframe  = session.iframe;
            iframe.parentNode.removeChild(iframe);
            
            if (session.onchange)
                session.pdoc.undoManager.off("change", session.onchange);
            
            doc.page.className.remove("loading");
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function(){
            load();
        });
        plugin.on("enable", function(){
            
        });
        plugin.on("disable", function(){
            
        });
        plugin.on("unload", function(){
            loaded = false;
            // drawn  = false;
        });
        
        /***** Register and define API *****/
        
        /**
         * Draws the file tree
         * @event afterfilesave Fires after a file is saved
         *   object:
         *     node     {XMLNode} description
         *     oldpath  {String} description
         **/
        plugin.freezePublicAPI({
            /**
             */
            loadDocument : loadDocument,
            
            /**
             */
            unloadDocument : unloadDocument
        });
        
        register(null, {
            "preview.markdown": plugin
        });
    }
});