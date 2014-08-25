WEBR = {
    nwgui: require('nw.gui'),
    util: require('utils'),
    db: require('db'),
    cheerio: require('cheerio'),
    moment: require('moment')
};
WEBR.Dialog = (function () {
    var $overlay = $('.webr-overlay'),
        isActive = false,
        activeDialog = null;
    
    function hide() {
        if (isActive) {
            activeDialog.fadeOut(400);
            $overlay.fadeOut(400);
            activeDialog = null;
            isActive = false;
        }
    }
    
    $('.webr-ovd').hide();
    $(document).keyup(function (e) {
        if (e.keyCode == 27) { // 'ESC' key
            hide();
        }
    })
    
    return {
        show: function (dialogName) {
            if (isActive) {
                activeDialog.hide();
            }
            isActive = true;
            $overlay.fadeIn(400);
            activeDialog = $('#webr-ovd-' + dialogName);
            activeDialog.fadeIn(400);
        },
        hide: hide
    };
}());
WEBR.Display = (function() {
    var db = WEBR.db,
        util = WEBR.util,
        moment = WEBR.moment;
    
    // renders an article given feed ID and article link
    function renderArticle(fid, link) {
        var $maintext = $('.webr-maintext');
        
        if (!fid || !link) {
            $maintext.html('No article selected.');
            return;
        }
        $maintext.html('Loading...');
        
        var feed = db.feeds[fid];
        if (!feed) {
            $maintext.html('Article not found.');
            return;
        }
        
        var post = db.findPost(feed.rss, link);
        if (!post) {
            $maintext.html('Article not found.');
            return;
        }
        if (!feed.sel) { // no selector: use post.desc
            _doRenderArticle(post, post.desc);
        } else { // scrape data from link
            util.pullArticle(link, feed.append, feed.sel, feed.remove, function (text) {
                _doRenderArticle(post, text);
            }, function (err) {
                $maintext.html('Error loading article.');
            });
        }
    }
    
    function _doRenderArticle(post, article) {
        var $maintext = $('.webr-maintext');
        var html = '<div class="webr-maintextitem"><div class="webr-maintextitem-header"><div class="webr-maintextitem-title">' + post.title + '</div><div class="webr-maintextitem-date">' + moment(post.date).format('DD MMM YYYY hh:mm:ss a') + '</div><div class="webr-clearfix"></div></div><div class="webr-maintextitem-body">' + article + '</div></div>'
        $maintext.html(html);
    }
    
    // resets list of articles
    function renderArticleList(fid) {
        var $articlelist = $('.webr-articlelisttable');
        
        if (!fid) {
            $articlelist.html('No feed selected.');
            return;
        }
        
        var feed = db.feeds[fid],
            cont = db.content[feed.rss];
        
        $articlelist.html('');
        
        if (cont && cont.length > 0) {
            for (var i in cont) {
                var $tr = $('<tr class="webr-articleitem"></tr>').data('link', cont[i].link).data('fid', fid);
                $('<td class="webr-articleitem-title"></td>').html(cont[i].title).appendTo($tr);
                $('<td class="webr-articleitem-date"></td>').html(moment(cont[i].date).format('DD MMM YYYY hh:mm:ss a')).appendTo($tr);
                $tr.appendTo($articlelist);
            }
        } else {
            $('<tr><td>No articles found.</td></tr>').appendTo($articlelist);
        }
    }
    
    // resets list of feeds
    function renderFeedList() {
        var $feedlist = $('.webr-feedlist');
        $feedlist.html('');
        if (db.feeds.length == 0) {
            $('<div class="webr-feeditem></div>').html('No feeds added.').appendTo($feedlist);
        } else {
            for (var i in db.feeds) {
                $('<a href="#">' + db.feeds[i].name + '</a>').data('id', i).appendTo($('<div class="webr-feeditem"></div>').data('id', i).appendTo($feedlist));
            }
        }
    }
    
    return {
        renderArticle: renderArticle,
        renderArticleList: renderArticleList,
        renderFeedList: renderFeedList
    };
}());


(function () {
    'use strict';
    
    var nwgui = WEBR.nwgui,
        util = WEBR.util,
        db = WEBR.db,
        cheerio = WEBR.cheerio,
        moment = WEBR.moment;
    
    var selectedFeed = -1,
        wid = window.innerWidth,
        hgt = window.innerHeight;
    
    
    function setupHandlers() {
        var heightChangeCallback = function() {
            var width = window.innerWidth,
                height = window.innerHeight;
            if (width != wid || height != hgt) {
                setTimeout(doResize, 500);
                wid = width;
                hgt = height;
            }
        };
        doResize();
        setInterval(db.pullAllFeeds, 60000);
        window.onresize = heightChangeCallback;
        
        // clicked feed list item
        $('.webr-feedlist').on('click', '.webr-feeditem a', function (e) {
            e.preventDefault();
            $('.webr-feeditem').removeClass('webr-feeditem-selected');
            $(this).parent().addClass('webr-feeditem-selected');
            selectedFeed = $(this).data('id');
            WEBR.Display.renderArticleList(selectedFeed);
            WEBR.Display.renderArticle(null, null);
        });
        
        // clicked article list item
        $('.webr-articlelisttable').on('click', '.webr-articleitem', function (e) {
            e.preventDefault();
            var fid = $(this).data('fid'),
                link = $(this).data('link');
            $('.webr-articleitem').removeClass('webr-articleitem-selected');
            $(this).addClass('webr-articleitem-selected');
            WEBR.Display.renderArticle(fid, link);
        });
        
        $('#webr-ct-add').click(function () {
            WEBR.Dialog.show('addfeed');
        });
    }
    
    function doResize() {
        var sidebarWid = wid * 0.3;
        if (sidebarWid > 300) sidebarWid = 300;
        $('.webr-sidebar').css({width: sidebarWid});
        $('.webr-mainpage').css({width: wid - sidebarWid - 2, left: sidebarWid + 2});
        $('.webr-articlelist').css({width: wid - sidebarWid - 2});
    }
    
    setupHandlers();
    db.loadData(nwgui, function () {
        WEBR.Display.renderFeedList();
    });
    
}());
