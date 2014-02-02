define(function(require, exports, module) {
    main.consumes = [
        "c9", "Previewer", "fs", "dialog.error", "commands", "tabManager"
    ];
    main.provides = ["preview.markdown"];
    return main;

    // @todo possible improvements: http://benweet.github.io/stackedit/#

    function main(options, imports, register) {
        var Previewer  = imports.Previewer;
        var c9         = imports.c9;
        var fs         = imports.fs;
        var commands   = imports.commands;
        var tabManager = imports.tabManager;
        var showError  = imports["dialog.error"].show;
        var dirname    = require("path").dirname;
        
        /***** Initialization *****/
        
        var plugin = new Previewer("Ajax.org", main.consumes, {
            caption  : "Markdown",
            index    : 200,
            selector : function(path){
                return path.match(/(?:\.md|\.markdown)$/i);
            }
        });
        var emit = plugin.getEmitter();
        
        var HTMLURL, previewOrigin;
        
        /***** Methods *****/
        
        function getPreviewUrl(fn){
            if (options.local && document.baseURI.substr(0, 5) == "file:")
                return setTimeout(getPreviewUrl.bind(null, fn), 100);
            else if (HTMLURL)
                return fn(HTMLURL);
            
            HTMLURL = (options.staticPrefix 
                ? (options.local ? dirname(document.baseURI) + "/static" : options.staticPrefix) 
                    + options.htmlPath
                : "/static/plugins/c9.ide.preview/previewers/markdown.html")
                    + "?host=" + (options.local ? "local" : location.origin);
                
            if (HTMLURL.charAt(0) == "/")
                HTMLURL = location.protocol + "//" + location.host + HTMLURL;
    
            previewOrigin = HTMLURL.match(/^(?:[^\/]|\/\/)*/)[0];
            
            fn(HTMLURL);
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function(){
            
        });
        plugin.on("documentLoad", function(e){
            var doc     = e.doc;
            var session = doc.getSession();
            var tab     = doc.tab;
            var editor  = e.editor;
            
            var iframe = document.createElement("iframe");
            
            // iframe.setAttribute("nwfaketop", true);
            iframe.setAttribute("nwdisable", true);

            iframe.style.width    = "100%";
            iframe.style.height   = "100%";
            iframe.style.border   = 0;
            iframe.style.backgroundColor = "rgba(255, 255, 255, 0.88)";
            
            if (options.local) {
                iframe.onload = function(){
                    plugin.activeSession.add(iframe.contentWindow.location.href);
                }
            }
            
            var onMessage = function(e) {
                if (c9.hosted && event.origin !== previewOrigin)
                    return;
                
                if (e.data.message == "exec") {
                    commands.exec(e.data.command);
                }
                else if (e.data.message == "focus") {
                    tabManager.focusTab(tab);
                }
                else if (e.data.message == "stream.document") {
                    session.source = e.source;
                    
                    if (session.previewTab) {
                        var doc = session.previewTab.document;
                        
                        session.source.postMessage({
                            type    : "document",
                            content : doc.value
                        }, "*");
                        
                        if (!doc.hasValue())
                            doc.once("setValue", function(){
                                emit("update", { previewDocument: doc });
                            });
                    }
                    else {
                        fs.readFile(session.path, function(err, data){
                            if (err)
                                return showError(err.message);
                            
                            session.source.postMessage({
                                type    : "document",
                                content : data
                            }, "*");
                        });
                    }
                    
                    session.source.postMessage({
                        type : "keys",
                        keys : commands.getExceptionBindings()
                    }, "*");
                    
                    tab.className.remove("loading");
                }
            };
            window.addEventListener("message", onMessage, false);
            session.addOther(function(){
                window.removeEventListener("message", onMessage, false);
            });
            
            // Set iframe
            session.iframe = iframe;
            
            // Load the markup renderer
            getPreviewUrl(function(url){ iframe.src = url; });
            
            session.editor = editor;
            editor.container.appendChild(session.iframe);
        });
        plugin.on("documentUnload", function(e){
            var doc     = e.doc;
            var session = doc.getSession();
            var iframe  = session.iframe;
            iframe.parentNode.removeChild(iframe);
            
            if (session.onchange)
                session.pdoc.undoManager.off("change", session.onchange);
            
            doc.tab.className.remove("loading");
        });
        plugin.on("documentActivate", function(e){
            var session = e.doc.getSession();
            
            session.iframe.style.display = "block";
            session.editor.setLocation(session.path);
            session.editor.setButtonStyle("Markdown", "page_white.png");
        });
        plugin.on("documentDeactivate", function(e){
            var session = e.doc.getSession();
            session.iframe.style.display = "none";
        });
        plugin.on("navigate", function(e){
            var tab    = plugin.activeDocument.tab;
            var iframe = plugin.activeSession.iframe;
            var editor = plugin.activeSession.editor;
            
            tab.className.add("loading");
            
            tab.title    = 
            tab.tooltip  = "[M] " + e.url;
            editor.setLocation(e.url);
            
            iframe.src = iframe.src;
        });
        plugin.on("update", function(e){
            var session = plugin.activeSession;
            if (!session.source) return; // Renderer is not loaded yet
    
            session.source.postMessage({
                type    : "document",
                content : e.previewDocument.value
            }, "*");
        });
        plugin.on("reload", function(){
            var iframe = plugin.activeSession.iframe;
            var tab    = plugin.activeDocument.tab;
            tab.className.add("loading");
            iframe.src = iframe.src;
        });
        plugin.on("enable", function(){
            
        });
        plugin.on("disable", function(){
            
        });
        plugin.on("unload", function(){
        });
        
        /***** Register and define API *****/
        
        /**
         * Previewer for markdown content.
         **/
        plugin.freezePublicAPI({
        });
        
        register(null, {
            "preview.markdown": plugin
        });
    }
});