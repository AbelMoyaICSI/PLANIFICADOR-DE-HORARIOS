$(document).ready(function() {

  var actividades = [];
  var selectedActivityIndex = null; 
  var selectedCell = null;          

  var dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  
 
  function compareHours(h1, h2) {
    var [a1, b1] = h1.split(":").map(Number);
    var [a2, b2] = h2.split(":").map(Number);
    if (a1 !== a2) return a1 - a2;
    return b1 - b2;
  }
  

  function checkOverlapAny(nombre, dia, horaInicio, horaFin) {
    for (let i = 0; i < actividades.length; i++) {
      let a = actividades[i];
      if (a.dia.toLowerCase() === dia.toLowerCase()) {

        if (
          compareHours(horaInicio, a.horaFin) < 0 &&
          compareHours(horaFin, a.horaInicio) > 0
        ) {
          return a; 
        }
      }
    }
    return null;
  }
  


  function construirTabla() {

    let timePoints = [];
    actividades.forEach(act => {
      timePoints.push(act.horaInicio);
      timePoints.push(act.horaFin);
    });

    timePoints = Array.from(new Set(timePoints));
    timePoints.sort(compareHours);
  

    $("#horariosBody").empty();
    let rows = [];
    for (let i = 0; i < timePoints.length - 1; i++) {
      let start = timePoints[i];
      let end = timePoints[i + 1];
      let $tr = $("<tr></tr>");
      $tr.append("<td>" + start + " - " + end + "</td>");
      dias.forEach(dia => {
        let $td = $("<td data-day='" + dia + "' data-start='" + start + "' data-end='" + end + "'></td>");
        $tr.append($td);
      });
      rows.push($tr);
    }

    rows.forEach(row => $("#horariosBody").append(row));


    $("#horariosBody tr").each(function() {
      let timeRange = $(this).find("td:first").text();
      let [rowStart, rowEnd] = timeRange.split(" - ");
      $(this).find("td").each(function(index) {
        if (index === 0) return; // omitir la columna de "Hora"
        let dia = $(this).attr("data-day");
        let act = actividades.find(
          a =>
            a.dia.toLowerCase() === dia &&
            compareHours(a.horaInicio, rowStart) <= 0 &&
            compareHours(a.horaFin, rowEnd) >= 0
        );
        if (act) {
          $(this).text(act.nombre);
          $(this).css({
            "background-color": act.color,
            "color": "#fff",
            "text-align": "center",
            "font-weight": "bold"
          });
        }
      });
    });
  
    $("#horariosBody tr").each(function() {
      let tieneActividad = false;
      $(this).find("td").each(function(index) {
        if (index === 0) return;
        if ($(this).text().trim() !== "") {
          tieneActividad = true;
        }
      });
      if (!tieneActividad) {
        $(this).remove();
      }
    });
  

    for (let col = 1; col <= dias.length; col++) {
      let prevCell = null;
      let rowspan = 1;
      $("#horariosBody tr").each(function() {
        let cell = $(this).find("td").eq(col);
        if (
          prevCell &&
          cell.is(":visible") &&
          cell.text().trim() !== "" &&
          cell.text() === prevCell.text() &&
          cell.css("background-color") === prevCell.css("background-color")
        ) {
          rowspan++;
          prevCell.attr("rowspan", rowspan);
          cell.hide();
        } else {
          prevCell = cell;
          rowspan = 1;
        }
      });
    }
  }
  
  function agregarActividad(nombre, dia, horaInicio, horaFin, color) {
    let conflict = checkOverlapAny(nombre, dia, horaInicio, horaFin);
    if (conflict) {
      alert(
        "El horario de '" +
          nombre +
          "' (" +
          horaInicio +
          " - " +
          horaFin +
          ") se cruza con '" +
          conflict.nombre +
          "' (" +
          conflict.horaInicio +
          " - " +
          conflict.horaFin +
          ") en " +
          dia +
          "."
      );
      return;
    }
    actividades.push({ nombre, dia, horaInicio, horaFin, color });
    construirTabla();
  }
  

  function buscarActividadPorCelda($cell) {
    let $row = $cell.closest("tr");
    let timeRange = $row.find("td:first").text().trim();
    let [rowStart, rowEnd] = timeRange.split(" - ");
    let dia = $cell.attr("data-day");
    let nombre = $cell.text().trim();
    for (let i = 0; i < actividades.length; i++) {
      let a = actividades[i];
      if (
        a.dia.toLowerCase() === dia.toLowerCase() &&
        a.nombre === nombre &&
        compareHours(a.horaInicio, rowStart) <= 0 &&
        compareHours(a.horaFin, rowEnd) >= 0
      ) {
        return i;
      }
    }
    return -1;
  }
  

  $("#horariosBody").on("click", "td", function() {
    if ($(this).index() === 0) return;
    $("td").removeClass("selected");
    $(this).addClass("selected");
    selectedCell = $(this);
    let idx = buscarActividadPorCelda($(this));
    selectedActivityIndex = idx >= 0 ? idx : null;
  });
  

  $("#agregarBtn").click(function() {
    let nombre = $("#nombreActividad").val().trim();
    let dia = $("#dia").val();
    let horaInicio = $("#horaInicio").val().trim();
    let horaFin = $("#horaFin").val().trim();
    let color = $("#colorActividad").val();
  
    if (!nombre || !horaInicio || !horaFin) {
      alert("Por favor, completa todos los campos.");
      return;
    }
    if (compareHours(horaFin, horaInicio) <= 0) {
      alert("La hora de fin debe ser mayor que la de inicio.");
      return;
    }
  
    agregarActividad(nombre, dia, horaInicio, horaFin, color);
  });
  

  $("#eliminarBtn").click(function() {
    if (selectedActivityIndex !== null && selectedActivityIndex >= 0) {
      actividades.splice(selectedActivityIndex, 1);
      selectedActivityIndex = null;
      selectedCell = null;
      construirTabla();
    } else {
      alert("Selecciona una actividad para eliminar.");
    }
  });
  

  $("#capturarBtn").click(function() {
    html2canvas(document.querySelector("#tablaHorarios")).then(function(canvas) {
      let link = document.createElement("a");
      link.download = "horarios.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });
  

  $(".instructions").click(function() {
    $(".instructions-list").slideToggle("slow");
    $(this).find("i").toggleClass("right");
  });
});
