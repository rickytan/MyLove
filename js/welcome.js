"use strict";
(function () {
    var debug;                      // show log or not

    var map;
    var initial_zoom = 4;
    var initial_position = new google.maps.LatLng(39.908, 116.397); // Beijing

    var storyImagesPath = "/images/lovestory/";
    var stories = ["qiyang", "hangzhou", "hangzhou2",
        "shaoxing", "suzhou", "wugongshan", "nanjing", "others", "huihanggudao", "yushandao", "xibei"];
    var storyMetas = [];
    var currentStory = 0;

    function log() {
        debug && console.log(arguments);
    }

    function updateProgress() {
        $('.progress-bar').css({
            width: "" + (100 * currentStory / stories.length) + "%"
        });
    }
    function showMap() {
        $('.preload').fadeOut(2000, function () {
            $(this).remove();
        });
        $('.main').fadeIn(2000);

        var mapOptions = {
            zoom: initial_zoom,
            maxZoom: 15,
            minZoom: 3,
            draggable: false,
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            scrollwheel: false,
            center: initial_position,
            mapTypeId: google.maps.MapTypeId.HYBRID
        };
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

        function x() {
            $.when(nextStory()).then(x).fail(function(e) {
                console.error(e);
            });
        }
        x();
    }
    function loadStories() {
        if (currentStory < stories.length) {
            var story = stories[currentStory++];
            return $.ajax(storyImagesPath + story + "/meta.json").then(function (json) {
                updateProgress();
                storyMetas.push(json);
                loadStories();
            });
        } else {
            currentStory = 0;
            showMap();
        }
    }
    function nextStory() {
        if (currentStory < stories.length) {
            var defer = $.Deferred();
            var meta = storyMetas[currentStory++];
            var latitude = meta['position']['latitude'];
            var longitude = meta['position']['longitude'];
            var position = new google.maps.LatLng(latitude, longitude);

            $.when(zoomToPosition(position, initial_zoom, meta.zoom)).then(function () {
                var t = 2400 * meta.story.length / Math.max((meta.images || []).length, 1);
                return $.when(showStoryCaption(meta.story), showImageStories(meta.images, t));
            }).then(function () {
                return zoomToPosition(position, meta.zoom, initial_zoom);
            }).then(function () {
                defer.resolve();
            });

            return defer.promise();
        } else {
            $('.left').show();
            $('.right').show();
            throw "Over!";
        }
    }

    google.maps.event.addDomListener(window, 'load', loadStories);

    function new_marker(position) {
        var marker = new google.maps.Marker({
            position: position,
            draggable: false,
            animation: google.maps.Animation.DROP
        });
        marker.setMap(map);
    }

    function showImageStories(images, timeout) {
        timeout = timeout || 3000;
        if (timeout < 3000) {
            timeout = 3000;
        }

        var defer = $.Deferred();
        function show() {
            if (images.length) {
                var img = images.shift();
                var loc = new google.maps.LatLng(img.latitude, img.longitude);
                var info = new google.maps.InfoWindow({
                    content: '<div class="info-image"><img src="' + img.image + '">' + '<p>' + img.description + '</p></div>',
                    position: loc
                });
                map.panTo(loc);
                new_marker(loc);
                info.open(map);
                setTimeout(function () {
                    info.close(map);
                    show();
                }, timeout);
            } else {
                defer.resolve();
            }
        }
        show();

        return defer.promise();
    }

    function showStoryCaption(captions) {
        var defer = $.Deferred();

        function text() {
            if (captions.length) {
                $("#story-caption").text(captions.shift());
                setTimeout(text, 2400);
            } else {
                $("#story-caption").text("");
                defer.resolve();
            }
        }
        text();

        return defer.promise();
    }

    function zoomToPosition(position, zoomStart, zoomEnd) {
        var defer = $.Deferred();
        // if zoomEnd is null, zoom from current zoom level to zoomStart, treat zoomStart as zoomEnd zoom.
        if (zoomEnd == null) {
            zoomEnd = zoomStart;
            zoomStart = map.getZoom();
        }

        var delta = zoomStart < zoomEnd ? 1 : -1;
        var current = zoomStart + delta;
        function centering() {
            if (current != zoomEnd + delta) {
                map.setCenter(position)
                map.setZoom(current);
                current += delta;
                setTimeout(centering, 800);
            } else {
                defer.resolve();
            }
        }
        centering();
        return defer.promise();
    }

    function zoomToInit(speed) {
        if (speed == null)
            zoomToPosition(initial_position, initial_zoom);
        else
            zoomToPosition(initial_position, initial_zoom);
    }

})();