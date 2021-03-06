(function () {
  "use strict";
  var debug; // show log or not

  var map;
  var initial_zoom = 4;
  var initial_position = new google.maps.LatLng(39.908, 116.397); // Beijing
  var storyImagesPath = "/images/lovestory/";
  var stories = ["qiyang", "hangzhou", "hangzhou2",
        "shaoxing", "suzhou", "wugongshan", "nanjing", "others", "huihanggudao", "yushandao", "xibei", "hangzhou3"];
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
        return $.when(showStoryCaption(meta.story), showImageStories(meta.images || [], t));
      }).then(function () {
        return zoomToPosition(position, meta.zoom, initial_zoom);
      }).then(function () {
        defer.resolve();
      });

      return defer.promise();
    } else if (currentStory++ === stories.length) {
      $('.left').show();
      $('.right').show();
      return zoomToInit();
    } else {
      throw new Error("Over!");
    }
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

    $(document.body).one('click', function () {
      var audio = document.getElementById('bgm');
      audio.play();
    });

    (function begin() {
      return nextStory().then(begin).fail(function (e) {
        console.error(e);
      });
    })();
    return;
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
        var preload = new Image();
        preload.src = img.image;
        preload.onload = function () {
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
        };
        preload.onerror = function () {
          setTimeout(function () {
            show();
          }, timeout);
        };
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
        $("#story-caption").text(captions.shift()).fadeIn(500);
        setTimeout(text, 2400);
      } else {
        $("#story-caption").fadeOut(500, function () {
          $(this).text("");
        });
        defer.resolve();
      }
    }
    text();

    return defer.promise();
  }

  function zoomToPosition(position, zoomStart, zoomEnd) {
    var defer = $.Deferred();
    // if zoomEnd is null, zoom from current zoom level to zoomStart, treat zoomStart as zoomEnd zoom.
    if (!zoomEnd) {
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

  function zoomToInit() {
    return zoomToPosition(initial_position, initial_zoom);
  }
  // Google Analytics: change UA-XXXXX-X to be your site's ID.
  setTimeout(function () {
    (function (i, s, o, g, r, a, m) {
      i['GoogleAnalyticsObject'] = r;
      i[r] = i[r] || function () {
        (i[r].q = i[r].q || []).push(arguments)
      }, i[r].l = 1 * new Date();
      a = s.createElement(o),
        m = s.getElementsByTagName(o)[0];
      a.async = 1;
      a.src = g;
      m.parentNode.insertBefore(a, m)
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
    ga('create', 'UA-41902529-2', 'auto');
    ga('send', 'pageview');
  }, 1000);
})();
