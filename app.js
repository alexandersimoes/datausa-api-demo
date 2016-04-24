var appData = {};
var currSumlevel = "county";
var currLang = "015";

function datafold(json) {
  return json.data.map(function(data){
    return json.headers.reduce(function(obj, header, i){
      obj[header] = data[i];
      return obj;
    }, {});
  });
}

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
    })
  })
})

$("#dd-sumlevel .dropdown-menu a").click(function(e){
  $("#dd-sumlevel button").text($(e.target).text())
  currSumlevel = $(e.target).attr("data-id");
  updateLang();
})


function updateLang(langId){
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
      if (i >= 5) {
        return;
      }
      var geoName = appData.geoNames.filter(function(g) { return g.id === speaker.geo })[0];
      var prof = $('<div class="prof" style="background-image: url(http://datausa.io/profile/geo/'+speaker.geo+'/img/);">').appendTo('.geos');
      var profAnchor = $('<a href="#" class="explore-title">'+(i+1)+". "+geoName.display_name+'</a>').appendTo(prof);
      prof.append('<span>'+(speaker.pct_speakers*100).toFixed(2)+'%</span>');
      profAnchor.click(function(e){
        $('.viz h2').text(geoName.display_name);
        $('.viz iframe').attr('src', 'http://embed.datausa.io/profile/geo/'+speaker.geo+'/demographics/languages?viz=True');
        return false;
      })
    })

  });
}