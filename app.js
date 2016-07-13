function datafold(json) {
  return json.data.map(function(data){
    return json.headers.reduce(function(obj, header, i){
      obj[header] = data[i];
      return obj;
    }, {});
  });
}

// borrowed from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var appData = {};
var maxResults = 10;
var currSumlevel = getParameterByName("sumlevel") || "county";
var currLang = getParameterByName("lang") || "015";
var sumLevels = [
  {id:"state",name:"State"},
  {id:"msa",name:"Metro Area"},
  {id:"county",name:"County"},
  {id:"place",name:"City"},
];

$(".dropdown").click(function(){
  var isActive = $(this).children(".dropdown-menu").hasClass("active");
  $(".dropdown-menu").removeClass("active");
  if(!isActive){
    $(this).children(".dropdown-menu").addClass("active");
  }
})

$.get("http://api.datausa.io/attrs/language/", function(langs) {
  langs = datafold(langs);
  var perCol = Math.ceil((langs.length+1) / 3);
  var currentCol;
  langs.forEach(function(l, i){
    if(i % perCol === 0){
      currentCol = $("<ul class='dd-col'>").appendTo("#dd-lang .dropdown-menu");
    }
    var langOpt = $('<li><a href="#" data-type="lang" data-id="'+l.id+'">'+l.name+'</a></li>').appendTo(currentCol);
    langOpt.click(function(e){
      $("#dd-lang button").text($(e.target).text())
      currLang = $(e.target).attr("data-id");
      updateLang();
      window.history.pushState({}, '', location.pathname + "?sumlevel="+currSumlevel+"&lang="+currLang);
      $(".dropdown-menu").removeClass("active");
      return false;
    })
    if(l.id === currLang){
      $(".dropdown#dd-lang button").text(l.name);
    }
  })
})

sumLevels.forEach(function(sl){
  currentCol = $(".dropdown#dd-sumlevel .dropdown-menu");
  var slOpt = $('<li><a href="#" data-type="sumlevel" data-id="'+sl.id+'">'+sl.name+'</a></li>').appendTo(currentCol);
  slOpt.click(function(e){
    $("#dd-sumlevel button").text($(e.target).text())
    currSumlevel = $(e.target).attr("data-id");
    updateLang();
    window.history.pushState({}, '', location.pathname + "?sumlevel="+currSumlevel+"&lang="+currLang);
    $(".dropdown-menu").removeClass("active");
    return false;
  })
  if(sl.id === currSumlevel){
    $(".dropdown#dd-sumlevel button").text(sl.name);
  }
})


function updateLang(){
  // clear prev state
  $(".geos").html('')
  
  $.when(
    // Get populations
    $.get("http://api.datausa.io/api/?show=geo&year=latest&sumlevel="+currSumlevel+"&required=pop&sort=desc&order=pop", function(populations) {
      appData.populations = datafold(populations);
    }),

    // Get lang data
    $.get("http://api.datausa.io/api/?sort=desc&show=geo&where=language:"+currLang+",num_speakers:!0&required=num_speakers&sumlevel="+currSumlevel+"&year=latest", function(speakers) {
      appData.speakers = datafold(speakers);
    }),

    // Geo geo names
    $.get("http://api.datausa.io/attrs/geo/", function(geos) {
      appData.geoNames = datafold(geos);
    })

  ).then(function() {

    var langData = appData.populations.reduce(function(o, v) {
      o[v.geo] = {"pop":v.pop, "geo":v.geo};
      return o;
    }, {});

    appData.speakers.forEach(function(s){
      if(langData[s.geo]){
        langData[s.geo]["num_speakers"] = s["num_speakers"];
        langData[s.geo]["pct_speakers"] = s["num_speakers"] / langData[s.geo]["pop"];
      }
    })

    var speakersPct = Object.keys(langData).map(function(k) { return langData[k]; });
    speakersPct = speakersPct.filter(function(s) { return s["pct_speakers"]; })
    speakersPct = speakersPct.sort(function(s1, s2) {
      // Descending: most num speakers to least
      return s2.pct_speakers - s1.pct_speakers;
    });

    speakersPct.forEach(function(speaker, i){
      if (i >= maxResults) {
        return;
      }
      var geoName = appData.geoNames.filter(function(g) { return g.id === speaker.geo })[0];
      var prof = $('<div class="prof" style="background-image: url(http://datausa.io/profile/geo/'+speaker.geo+'/img/);">').appendTo('.geos');
      var profAnchor = $('<a href="#" class="explore-title">'+(i+1)+". "+geoName.display_name+'</a>').appendTo(prof);
      prof.append('<span>'+(speaker.pct_speakers*100).toFixed(2)+'%</span>');
      prof.click(function(e){
        $('.prof').removeClass('active')
        $(this).addClass('active');
        $('.viz h2').text(geoName.display_name);
        $('.viz iframe').attr('src', 'http://embed.datausa.io/profile/geo/'+speaker.geo+'/demographics/languages?viz=True');
        return false;
      })
      // activate first profile link
      if (i === 0) {
        prof.addClass('active');
        prof.click();
      }
    })

  });
}

updateLang();
