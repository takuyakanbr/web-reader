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
        activeDialog = null,
        db = WEBR.db;
    
    function hide() {
        if (isActive) {
            activeDialog.fadeOut(300);
            $overlay.fadeOut(300);
            activeDialog = null;
            isActive = false;
        }
    }
    
    $('.webr-ovd').hide();
    $(document).keyup(function (e) {
        if (e.keyCode == 27) { // 'ESC' key
            hide();
        }
    });
    
    
    function getEditFeedSelectedFeed() {
        return db.findFeed($('.webr-ovd-editfeed-option:selected').data('rss'));
    }
    
    function getSuggestFeedSelectedFeed() {
        return $('.webr-ovd-suggest-option:selected').data('feed');
    }
    
    // reset list of feeds in feed selector, keeping the previous selected if possible
    function refreshEditFeedSelector() {
        var feeds = db.feeds(),
            feed = getEditFeedSelectedFeed(),
            $select = $('#webr-ovd-editfeed-select').html('');
        for (var i in feeds) {
            var opt = $('<option class="webr-ovd-editfeed-option"></option>').text(feeds[i].name).data('rss', feeds[i].rss).appendTo($select);
            if (feed && feed.rss == feeds[i].rss) {
                opt.prop('selected', true);
            }
        }
        refreshEditFeedData();
    }
    
    function refreshSuggestFeedSelector() {
        var suggs = db.suggestions,
            $select = $('#webr-ovd-suggest-select').html('');
        for (var i = 0; i < suggs.length; i++) {
            $('<option class="webr-ovd-suggest-option"></option>').text(suggs[i].name).data('feed', suggs[i]).appendTo($select);
        }
    }
    
    function refreshEditFeedData() {
        var feed = getEditFeedSelectedFeed();
        if (feed) {
            $('#webr-ovd-editfeed-name').val(feed.name);
            $('#webr-ovd-editfeed-rss').val(feed.rss);
            $('#webr-ovd-editfeed-append').val(feed.append);
            $('#webr-ovd-editfeed-sel').val(feed.sel);
            $('#webr-ovd-editfeed-remove').val(feed.remove);
        } else {
            $('#webr-ovd-editfeed-name').val('');
            $('#webr-ovd-editfeed-rss').val('');
            $('#webr-ovd-editfeed-append').val('');
            $('#webr-ovd-editfeed-sel').val('');
            $('#webr-ovd-editfeed-remove').val('');
        }
    }
    
    function refreshSettingsDialog() {
        var sett = db.settings;
        $('#webr-ovd-settings-font').val(sett.articleFont);
        $('#webr-ovd-settings-fontsize').val(sett.articleFontSize);
        $('#webr-ovd-settings-lineheight').val(sett.lineHeight);
        $('#webr-ovd-settings-updaterate').val(sett.updateRate);
        $('#webr-ovd-settings-remove').val(sett.removeOlderThan);
    }
    
    return {
        show: function (dialogName) {
            if (isActive) {
                activeDialog.hide();
            }
            isActive = true;
            $overlay.fadeIn(300);
            activeDialog = $('#webr-ovd-' + dialogName);
            activeDialog.fadeIn(300);
        },
        hide: hide,
        getEditFeedSelectedFeed: getEditFeedSelectedFeed,
        getSuggestFeedSelectedFeed: getSuggestFeedSelectedFeed,
        refreshEditFeedSelector: refreshEditFeedSelector,
        refreshSuggestFeedSelector: refreshSuggestFeedSelector,
        refreshEditFeedData: refreshEditFeedData,
        refreshSettingsDialog: refreshSettingsDialog
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
WEBR.Display = (function () {
    var db = WEBR.db,
        util = WEBR.util,
        moment = WEBR.moment;
    
    var $articlelist = $('.webr-articlelisttable'),
        $feedlist = $('.webr-feedlist'),
        $headtitle = $('.webr-head-title'),
        $headbuttons = $('.webr-head-buttons'),
        $headbuttonsarticle = $('.webr-head-buttons-article'),
        $starbtn = $('#webr-hdb-star'),
        $unstarbtn = $('#webr-hdb-unstar'),
        displayedFeed = null,
        displayedPost = null,
        displayedPostLoaded = false;
    
    // renders an article given feed ID and article link
    function renderArticle(feed, link) {
        displayedPostLoaded = false;
        var $maintext = $('.webr-maintext');
        $headbuttonsarticle.hide();
        
        if (!feed || !link) {
            displayedPost = null;
            $maintext.html('No article selected.');
            return;
        }
        $maintext.html('Loading...');
        
        if (!feed) {
            displayedPost = null;
            $maintext.html('Article not found.');
            return;
        }
        
        var post = db.findPost(feed, link);
        displayedPost = post;
        if (!post) {
            $maintext.html('Article not found.');
            return;
        }
        
        // for saved articles
        if (feed.rss == db.savedFeed.rss) {
            _doRenderArticle(post, post.article);
            return;
        }
        
        if (!post.read) {
            post.read = new Date();
            db.saveFeedContent(feed.rss);
            if (feed.unread) feed.unread--;
            if (feed.read) feed.read++;
            else feed.read = 1;
            updateUnreadCount(feed);
        }
        $headbuttonsarticle.show();
        if (db.isArticleSaved(post)) {
            $starbtn.hide();
            $unstarbtn.show();
        } else {
            $starbtn.show();
            $unstarbtn.hide();
        }
        if (!feed.sel) { // no selector: use post.desc
            _doRenderArticle(post, post.desc);
            displayedPostLoaded = true;
        } else { // scrape data from link
            util.pullArticle(link, feed.append, feed.sel, feed.remove, function (text) {
                _doRenderArticle(post, text);
            }, function (err) {
                $maintext.html('Error loading article: ' + err);
            });
        }
    }
    
    function _doRenderArticle(post, article) {
        if (displayedPost && displayedPost.link == post.link) {
            var $maintext = $('.webr-maintext');
            var html = '<div class="webr-maintextitem"><div class="webr-maintextitem-header"><div class="webr-maintextitem-title">' + post.title + ' </div> <div class="webr-maintextitem-date">' + moment(post.date).format('DD MMM YYYY hh:mm:ss a') + '</div><div class="webr-clearfix"></div></div><div class="webr-maintextitem-body">' + article + '</div></div>';
            $maintext.html(html);
            displayedPostLoaded = true;
        }
    }
    
    // resets list of articles
    function renderArticleList(feed) {
        displayedFeed = feed;
        renderArticleControls(feed);
        if (!feed) {
            $articlelist.html('No feed selected.');
            return;
        }
        
        $headbuttonsarticle.hide();
        $headbuttons.show();
        displayedPost = null;
        $articlelist.html('');
        
        var cont = db.content[feed.rss];
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
            $('<tr class="webr-articleitem"><td>No articles found.</td></tr>').appendTo($articlelist);
        }
        $('.webr-articlelist').scrollTop(0);
    }
    
    // refresh the article list if feed matches displayedFeed
    function refreshArticleList(feed) {
        if (!feed || !displayedFeed) return;
        if (feed.rss != displayedFeed.rss) return;
        
        $articlelist.html('');
        var cont = db.content[feed.rss];
        if (cont && cont.length > 0) {
            for (var i in cont) {
                var $tr = $('<tr class="webr-articleitem"></tr>').data('link', cont[i].link).data('rss', feed.rss);
                $('<td class="webr-articleitem-title"></td>').html(cont[i].title).appendTo($tr);
                $('<td class="webr-articleitem-date"></td>').html(moment(cont[i].date).format('DD MMM YYYY hh:mm:ss a')).appendTo($tr);
                if (!cont[i].read) {
                    $tr.addClass('webr-articleitem-unread');
                }
                if (displayedPost && displayedPost.link == cont[i].link) {
                    $tr.addClass('webr-articleitem-selected');
                }
                $tr.appendTo($articlelist);
            }
        } else {
            $('<tr class="webr-articleitem"><td>No articles found.</td></tr>').appendTo($articlelist);
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
        var feeds = db.feeds();
        $feedlist.html('');
        if (feeds.length == 0) {
            $('<div class="webr-feeditem></div>').html('No feeds added.').appendTo($feedlist);
        } else {
            for (var i in feeds) {
                
                // add each feed to feed list
                var $feeditem = $('<div class="webr-feeditem"></div>').data('rss', feeds[i].rss);
                $('<a href="#">' + feeds[i].name + '</a>').data('rss', feeds[i].rss).appendTo($feeditem);
                if (feeds[i].unread) {
                    $('<div class="webr-feeditem-unread"></div>').text(feeds[i].unread).appendTo($feeditem);
                } else {
                    $('<div class="webr-feeditem-unread"></div>').text(0).appendTo($feeditem).hide();
                }
                if (displayedFeed && displayedFeed.rss == feeds[i].rss) {
                    $feeditem.addClass('webr-feeditem-selected');
                }
                $feeditem.appendTo($feedlist);
                
            }
        }
    }
    
    function updateUnreadCount(feed) {
        if (!feed) return;
        var $items = $('.webr-feeditem');
        for (var i = 0; i < $items.length; i++) {
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
        getDisplayedFeed: function() { return displayedFeed },
        getDisplayedPost: function() { return displayedPost },
        isDisplayedPostLoaded: function() { return displayedPostLoaded },
        getDisplayedArticle: function () { return $('.webr-maintextitem-body').html() },
        renderArticle: renderArticle,
        renderArticleList: renderArticleList,
        refreshArticleList: refreshArticleList,
        renderArticleControls: renderArticleControls,
        renderFeedList: renderFeedList,
        updateUnreadCount: updateUnreadCount
    };
}());
WEBR.Settings = (function () {
    var db = WEBR.db;
    
    return {
        apply: function () {
            $('.webr-maintext').css('font-size', db.settings.articleFontSize + 'px');
            $('.webr-maintext').css('font-family', '\'' + db.settings.articleFont + '\', sans-serif');
            jss.remove('.webr-paragraph');
            jss.set('.webr-paragraph', { 'line-height': db.settings.lineHeight + '' });
        }
    };
}());


(function () {
    'use strict';
    
    var nwgui = WEBR.nwgui,
        util = WEBR.util,
        db = WEBR.db,
        cheerio = WEBR.cheerio,
        moment = WEBR.moment;
    
    var wid = window.innerWidth,
        hgt = window.innerHeight,
        guiWindow = nwgui.Window.get();;
    
    
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
        window.onfocus = function () {
            $('.webr-window').css('border', '2px solid #3c3f41');
            $('.webr-topbar').css('background-color', '#3c3f41');
            $('.webr-articlelist').css('border-bottom', '2px solid #3c3f41');
        };
        window.onblur = function () {
            $('.webr-window').css('border', '2px solid #555759');
            $('.webr-topbar').css('background-color', '#555759');
            $('.webr-articlelist').css('border-bottom', '2px solid #555759');
        };
        $('#webr-topbar-close').click(function () {
            guiWindow.close();
        });
        $('#webr-topbar-min').click(function () {
            guiWindow.minimize();
        });
        WEBR.Settings.apply();
        
        
        // clicked feed list item
        $('.webr-feedlist').on('click', '.webr-feeditem a', function (e) {
            e.preventDefault();
            $('.webr-feeditem').removeClass('webr-feeditem-selected');
            $(this).parent().addClass('webr-feeditem-selected');
            var feed = db.findFeed($(this).data('rss'));
            WEBR.Display.renderArticleList(feed);
            WEBR.Display.renderArticle(null, null);
        });
        // clicked saved feeds
        $('.webr-feeditem-saved').click(function (e) {
            e.preventDefault();
            $('.webr-feeditem').removeClass('webr-feeditem-selected');
            $(this).addClass('webr-feeditem-selected');
            var feed = db.savedFeed;
            WEBR.Display.renderArticleList(feed);
            WEBR.Display.renderArticle(null, null);
            return false;
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
        // clicked links within article
        $('.webr-maintext').on('click', 'a', function (e) {
            e.preventDefault();
            nwgui.Window.open($(this).attr('href'), { width: 1200, height: 750, focus: true });
            return false;
        });
        
        
        // ----- sidebar and titlebar controls -----
        
        $('#webr-ct-add').click(function () {
            WEBR.Dialog.show('addfeed');
        });
        $('#webr-ct-suggest').click(function () {
            WEBR.Dialog.refreshSuggestFeedSelector();
            WEBR.Dialog.show('suggest');
        })
        $('#webr-ct-edit').click(function () {
            WEBR.Dialog.refreshEditFeedSelector();
            WEBR.Dialog.show('editfeed');
        });
        $('#webr-ct-settings').click(function () {
            WEBR.Dialog.refreshSettingsDialog();
            WEBR.Dialog.show('settings');
        });
        $('#webr-ct-refresh').click(function () {
            db.pullAllFeeds(true);
        });
        $('#webr-hdb-read').click(function () {
            var feed = WEBR.Display.getDisplayedFeed();
            var updated = db.markAllAsRead(feed);
            WEBR.Notify.show(updated + ' article' + ((updated == 1) ? '' : 's') + ' marked as read.', 1500);
            WEBR.Display.updateUnreadCount(feed);
        });
        $('#webr-hdb-star').click(function () {
            if (!WEBR.Display.isDisplayedPostLoaded()) return;
            var post = WEBR.Display.getDisplayedPost(),
                article = WEBR.Display.getDisplayedArticle();
            if (db.saveArticle(post, article)) {
                $('#webr-hdb-star').hide();
                $('#webr-hdb-unstar').show();
                db.saveFeedContent('saved');
                WEBR.Display.refreshArticleList(db.savedFeed);
                WEBR.Notify.show('Article saved.', 1400);
            }
        });
        $('#webr-hdb-unstar').click(function () {
            if (!WEBR.Display.isDisplayedPostLoaded()) return;
            var post = WEBR.Display.getDisplayedPost();
            if (db.unsaveArticle(post)) {
                $('#webr-hdb-star').show();
                $('#webr-hdb-unstar').hide();
                db.saveFeedContent('saved');
                WEBR.Display.refreshArticleList(db.savedFeed);
                WEBR.Notify.show('Article unsaved.', 1400);
            }
        });
        $('#webr-hdb-openlink').click(function () {
            var post = WEBR.Display.getDisplayedPost();
            if (!post) return;
            nwgui.Window.open(post.link, { width: 1200, height: 750, focus: true });
        });
        
        
        // ----- dialogboxes -----
        
        $('.webr-ovd-container').click(function () {
            WEBR.Dialog.hide();
        })
        .children().click(function (e) {
            return false;
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
            WEBR.Display.renderFeedList();
            
            WEBR.Dialog.hide();
            $('#webr-ovd-addfeed-name').val('');
            $('#webr-ovd-addfeed-rss').val('');
            $('#webr-ovd-addfeed-append').val('');
            $('#webr-ovd-addfeed-sel').val('');
            $('#webr-ovd-addfeed-remove').val('');
        });
        $('#webr-ovd-suggest-submit').click(function () {
            var feed = WEBR.Dialog.getSuggestFeedSelectedFeed();
            if (db.addFeed(feed.name, feed.rss, feed.append, feed.sel, feed.remove)) {
                WEBR.Display.renderFeedList();
                WEBR.Dialog.hide();
            }
        });
        $('#webr-ovd-editfeed-submit').click(function () {
            var feed = WEBR.Dialog.getEditFeedSelectedFeed();
            if (feed) {
                var name = $('#webr-ovd-editfeed-name').val();
                if (name.length == 0) {
                    WEBR.Notify.show('Please enter a valid name.', 1500);
                    return;
                }
                feed.name = name;
                feed.append = $('#webr-ovd-editfeed-append').val();
                feed.sel = $('#webr-ovd-editfeed-sel').val();
                feed.remove = $('#webr-ovd-editfeed-remove').val();
                WEBR.Notify.show('Feed information updated.', 1500);
                db.saveFeedList();
                WEBR.Display.renderFeedList();
                WEBR.Dialog.hide();
            } else {
                WEBR.Notify.show('Please select a feed.', 1500);
            }
        });
        $('#webr-ovd-editfeed-rm').click(function () {
            var feed = WEBR.Dialog.getEditFeedSelectedFeed();
            if (db.removeFeed(feed)) {
                WEBR.Notify.show('Feed deleted.', 1500);
                if (WEBR.Display.getDisplayedFeed().rss == feed.rss) {
                    WEBR.Display.renderArticle(null, null);
                    WEBR.Display.renderArticleList(null);
                }
                WEBR.Display.renderFeedList();
                WEBR.Dialog.hide();
            }
        });
        $('#webr-ovd-editfeed-select').change(function () {
            WEBR.Dialog.refreshEditFeedData();
        });
        $('#webr-ovd-editfeed-up').click(function () {
            var feed = WEBR.Dialog.getEditFeedSelectedFeed(),
                ind = db.getFeedIndex(feed);
            db.swapFeedsByIndex(ind - 1, ind);
            WEBR.Dialog.refreshEditFeedSelector();
            WEBR.Display.renderFeedList();
        });
        $('#webr-ovd-editfeed-down').click(function () {
            var feed = WEBR.Dialog.getEditFeedSelectedFeed(),
                ind = db.getFeedIndex(feed);
            db.swapFeedsByIndex(ind, ind + 1);
            WEBR.Dialog.refreshEditFeedSelector();
            WEBR.Display.renderFeedList();
        });
        $('#webr-ovd-settings-submit').click(function () {
            try {
                db.settings.articleFont = $('#webr-ovd-settings-font').val();
                db.settings.articleFontSize = parseInt($('#webr-ovd-settings-fontsize').val());
                db.settings.lineHeight = parseFloat($('#webr-ovd-settings-lineheight').val());
                db.settings.updateRate = parseInt($('#webr-ovd-settings-updaterate').val());
                db.settings.removeOlderThan = parseInt($('#webr-ovd-settings-remove').val());
                WEBR.Settings.apply();
                db.saveSettings();
                WEBR.Dialog.hide();
            } catch (e) {
                WEBR.Notify.show('Error saving settings.', 1500);
            }
        });
    }
    
    function doResize() {
        var sidebarWid = wid * 0.3;
        if (sidebarWid > 300) sidebarWid = 300;
        $('.webr-sidebar').css({ width: sidebarWid });
        $('.webr-mainpage').css({ width: wid - sidebarWid - 2 - 4, left: sidebarWid + 2 });
        $('.webr-articlelist').css({ width: wid - sidebarWid - 2 - 5 });
        $('.webr-maintext').css({ height: $('.webr-maincontentarea').height() - 40 - 4 });
    }
    
    db.loadData(WEBR, nwgui, function () {
        WEBR.Display.renderFeedList();
        setupHandlers();
    });
    
}());
