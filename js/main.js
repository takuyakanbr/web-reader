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
WEBR.Notify = (function () {
    var $notifBox = $('.webr-notification-box'),
        $notif = $('.webr-notification'),
        createTime = -1,
        lifeTime = 0;
    
    function hide() {
        if (createTime > 0) {
            $notifBox.fadeOut(400);
            createTime = -1;
        }
    }
    
    function resize() {
        var winWid = window.innerWidth;
        var boxWid = $notifBox.width();
        $notifBox.css({ top: 58, left: (winWid / 2) - (boxWid / 2) });
    }
    
    setInterval(function () {
        if (createTime > 0) {
            if (new Date().getTime() > createTime + lifeTime) {
                hide();
            }
        }
    }, 400);
    resize();
    
    return {
        show: function (text, time) {
            $notif.html(text);
            resize();
            $notifBox.fadeIn(400);
            lifeTime = time;
            createTime = new Date().getTime();
        },
        hide: hide,
        resize: resize
    };
}());
WEBR.Display = (function() {
    var db = WEBR.db,
        util = WEBR.util,
        moment = WEBR.moment;
    
    var $articlelist = $('.webr-articlelisttable'),
        $feedlist = $('.webr-feedlist'),
        $headtitle = $('.webr-head-title'),
        $headbuttons = $('.webr-head-buttons'),
        $headbuttonsarticle = $('.webr-head-buttons-article');
    
    // renders an article given feed ID and article link
    function renderArticle(feed, link) {
        var $maintext = $('.webr-maintext');
        
        if (!feed || !link) {
            $maintext.html('No article selected.');
            return;
        }
        $maintext.html('Loading...');
        
        if (!feed) {
            $maintext.html('Article not found.');
            return;
        }
        
        var post = db.findPost(feed, link);
        if (!post) {
            $maintext.html('Article not found.');
            return;
        }
        if (!post.read) {
            post.read = new Date();
            db.saveFeedContent(feed.rss);
            if (feed.unread) feed.unread--;
            updateFeedUnread(feed);
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
        var html = '<div class="webr-maintextitem"><div class="webr-maintextitem-header"><div class="webr-maintextitem-title">' + post.title + '</div><div class="webr-maintextitem-date">' + moment(post.date).format('DD MMM YYYY hh:mm:ss a') + '</div><div class="webr-clearfix"></div></div><div class="webr-maintextitem-body">' + article + '</div></div>';
        $headbuttonsarticle.show();
        $maintext.html(html);
    }
    
    // resets list of articles
    function renderArticleList(feed) {
        if (!feed) {
            $articlelist.html('No feed selected.');
            return;
        }
        
        var cont = db.content[feed.rss];
        
        $headbuttonsarticle.hide();
        $headbuttons.show();
        $articlelist.html('');
        
        if (cont && cont.length > 0) {
            for (var i in cont) {
                var $tr = $('<tr class="webr-articleitem"></tr>').data('link', cont[i].link).data('rss', feed.rss);
                $('<td class="webr-articleitem-title"></td>').html(cont[i].title).appendTo($tr);
                $('<td class="webr-articleitem-date"></td>').html(moment(cont[i].date).format('DD MMM YYYY hh:mm:ss a')).appendTo($tr);
                if (!cont[i].read) {
                    $tr.addClass('webr-articleitem-unread');
                }
                $tr.appendTo($articlelist);
            }
        } else {
            $('<tr><td>No articles found.</td></tr>').appendTo($articlelist);
        }
    }
    
    function renderArticleControls(feed) {
        if (!feed) {
            $headtitle.text('');
            $headbuttonsarticle.hide();
            $headbuttons.hide();
        } else {
            $headbuttons.show();
            $headtitle.text(feed.name);
        }
    }
    
    // resets list of feeds
    function renderFeedList() {
        $feedlist.html('');
        if (db.feeds.length == 0) {
            $('<div class="webr-feeditem></div>').html('No feeds added.').appendTo($feedlist);
        } else {
            for (var i in db.feeds) {
                
                // add each feed to feed list
                var $feeditem = $('<div class="webr-feeditem"></div>').data('rss', db.feeds[i].rss);
                $('<a href="#">' + db.feeds[i].name + '</a>').data('rss', db.feeds[i].rss).appendTo($feeditem);
                if (db.feeds[i].unread) {
                    $('<div class="webr-feeditem-unread"></div>').text(db.feeds[i].unread).appendTo($feeditem);
                } else {
                    $('<div class="webr-feeditem-unread"></div>').text(0).appendTo($feeditem).hide();
                }
                $feeditem.appendTo($feedlist);
                
            }
        }
    }
    
    function updateFeedUnread(feed) {
        var $items = $('.webr-feeditem');
        for (var i in $items) {
            var $i = $($items[i]);
            if ($i.data('rss') == feed.rss) {
                // update unread counter
                var $unread = $i.children('.webr-feeditem-unread');
                if (feed.unread) {
                    $unread.text(feed.unread).hide().fadeIn(600);
                } else {
                    $unread.text(0).fadeOut(600);
                }
                return;
            }
        }
    }
    
    return {
        renderArticle: renderArticle,
        renderArticleList: renderArticleList,
        renderArticleControls: renderArticleControls,
        renderFeedList: renderFeedList,
        updateFeedUnread: updateFeedUnread
    };
}());


(function () {
    'use strict';
    
    var nwgui = WEBR.nwgui,
        util = WEBR.util,
        db = WEBR.db,
        cheerio = WEBR.cheerio,
        moment = WEBR.moment;
    
    var selectedFeed = null,
        wid = window.innerWidth,
        hgt = window.innerHeight;
    
    
    function setupHandlers() {
        var heightChangeCallback = function() {
            var width = window.innerWidth,
                height = window.innerHeight;
            if (width != wid || height != hgt) {
                setTimeout(doResize, 500);
                WEBR.Notify.resize();
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
            var feed = db.findFeed($(this).data('rss'));
            selectedFeed = feed;
            WEBR.Display.renderArticleControls(feed);
            WEBR.Display.renderArticleList(feed);
            WEBR.Display.renderArticle(null, null);
        });
        
        // clicked article list item
        $('.webr-articlelisttable').on('click', '.webr-articleitem', function (e) {
            e.preventDefault();
            var rss = $(this).data('rss'),
                link = $(this).data('link');
            $('.webr-articleitem').removeClass('webr-articleitem-selected');
            $(this).addClass('webr-articleitem-selected');
            $(this).removeClass('webr-articleitem-unread');
            WEBR.Display.renderArticle(db.findFeed(rss), link);
        });
        
        $('#webr-ct-add').click(function () {
            WEBR.Dialog.show('addfeed');
        });
        $('#webr-ct-edit').click(function () {
            //
        });
        $('#webr-ct-refresh').click(function () {
            db.pullAllFeeds(true);
        });
        $('#webr-hdb-read').click(function () {
            //mark-all-as-read TODO
        });
        
        
        $('#webr-ovd-addfeed-submit').click(function () {
            var name = $('#webr-ovd-addfeed-name').val(),
                rss = $('#webr-ovd-addfeed-rss').val();
            if (name.length == 0 || rss.length < 4) {
                WEBR.Notify.show('Please enter a name and link.', 1500);
                return;
            }
            db.addFeed(name, rss, $('#webr-ovd-addfeed-append').val(),
                      $('#webr-ovd-addfeed-sel').val(), $('#webr-ovd-addfeed-remove').val());
            WEBR.Dialog.hide();
        });
    }
    
    function doResize() {
        var sidebarWid = wid * 0.3;
        if (sidebarWid > 300) sidebarWid = 300;
        $('.webr-sidebar').css({width: sidebarWid});
        $('.webr-mainpage').css({width: wid - sidebarWid - 2, left: sidebarWid + 2});
        $('.webr-articlelist').css({width: wid - sidebarWid - 2});
        $('.webr-maintext').css({height: $('.webr-maincontentarea').height() - 40 })
    }
    
    db.loadData(WEBR, nwgui, function () {
        WEBR.Display.renderFeedList();
        setupHandlers();
    });
    
}());
