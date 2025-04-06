$(document).ready(function() {

  var actividades = [];
  var selectedActivityIndex = null; 
  var selectedCell = null;          
  var dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

  // Convierte "HH:MM" a minutos desde la medianoche
  function timeToMinutes(timeStr) {
    var parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // Convierte minutos a formato "HH:MM".
  // Si los minutos son >= 1440 (actividad que cruza la medianoche), se resta 1440 y se indica "día siguiente".
  function minutesToTime(minutes) {
    if(minutes >= 1440) {
      var mReal = minutes - 1440;
      var h = Math.floor(mReal / 60);
      var min = mReal % 60;
      return (h < 10 ? "0" + h : h) + ":" + (min < 10 ? "0" + min : min) + " (d.sig)";
    } else {
      var h = Math.floor(minutes / 60);
      var min = minutes % 60;
      return (h < 10 ? "0" + h : h) + ":" + (min < 10 ? "0" + min : min);
    }
  }
  
  // Comparación de minutos
  function compareMinutes(m1, m2) {
    return m1 - m2;
  }
  
  // Verifica solapamiento usando tiempos en minutos
  function checkOverlapAny(nombre, dia, startM, endM) {
    for (let i = 0; i < actividades.length; i++) {
      let a = actividades[i];
      if (a.dia.toLowerCase() === dia.toLowerCase()) {
        // Si hay solapamiento: new.start < existing.end y new.end > existing.start
        if (startM < a.endM && endM > a.startM) {
          return a; 
        }
      }
    }
    return null;
  }
  
  // Construir la tabla según los intervalos de tiempo
  function construirTabla() {
    let timePoints = [];
    actividades.forEach(act => {
      timePoints.push(act.startM);
      timePoints.push(act.endM);
    });
    // Eliminar duplicados y ordenar
    timePoints = Array.from(new Set(timePoints));
    timePoints.sort((a, b) => a - b);

    $("#horariosBody").empty();
    let rows = [];
    for (let i = 0; i < timePoints.length - 1; i++) {
      let start = timePoints[i];
      let end = timePoints[i + 1];
      let $tr = $("<tr></tr>");
      $tr.append("<td>" + minutesToTime(start) + " - " + minutesToTime(end) + "</td>");
      dias.forEach(dia => {
        let $td = $("<td data-day='" + dia + "' data-start='" + start + "' data-end='" + end + "' class='editable'></td>");
        $tr.append($td);
      });
      rows.push($tr);
    }

    rows.forEach(row => $("#horariosBody").append(row));

    // Rellenar celdas según las actividades
    $("#horariosBody tr").each(function() {
      let timeRange = $(this).find("td:first").text();
      let parts = timeRange.split(" - ");
      let rowStart = timeToMinutes(parts[0].split(" ")[0]); // ignorar indicativo (d.sig) si existe
      let rowEnd = timeToMinutes(parts[1].split(" ")[0]);
      $(this).find("td").each(function(index) {
        if (index === 0) return; // omitir columna "Hora"
        let dia = $(this).attr("data-day");
        let act = actividades.find(
          a =>
            a.dia.toLowerCase() === dia &&
            a.startM <= rowStart &&
            a.endM >= rowEnd
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
    
    // Remover filas sin actividad
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
    
    // Fusionar celdas consecutivas con el mismo contenido y estilo en cada columna
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
  
  // Agregar actividad, ajustando tiempos que cruzan la medianoche
  function agregarActividad(nombre, dia, horaInicio, horaFin, color) {
    let startM = timeToMinutes(horaInicio);
    let endM = timeToMinutes(horaFin);
    // Si la actividad cruza la medianoche, se ajusta sumándole 1440 minutos
    if (endM <= startM) {
      endM += 1440;
    }
    let conflict = checkOverlapAny(nombre, dia, startM, endM);
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
          minutesToTime(conflict.startM) +
          " - " +
          minutesToTime(conflict.endM) +
          ") en " +
          dia +
          "."
      );
      return;
    }
    actividades.push({ nombre, dia, horaInicio, horaFin, startM, endM, color });
    construirTabla();
  }
  
  // Buscar actividad asociada a la celda clicada
  function buscarActividadPorCelda($cell) {
    let $row = $cell.closest("tr");
    let timeRange = $row.find("td:first").text().trim();
    let parts = timeRange.split(" - ");
    let rowStart = timeToMinutes(parts[0].split(" ")[0]);
    let rowEnd = timeToMinutes(parts[1].split(" ")[0]);
    let dia = $cell.attr("data-day");
    let nombre = $cell.text().trim();
    for (let i = 0; i < actividades.length; i++) {
      let a = actividades[i];
      if (
        a.dia.toLowerCase() === dia.toLowerCase() &&
        a.nombre === nombre &&
        a.startM <= rowStart &&
        a.endM >= rowEnd
      ) {
        return i;
      }
    }
    return -1;
  }
  
  // Evento de un solo clic: Seleccionar la actividad (para eliminar, por ejemplo)
  $("#horariosBody").on("click", "td.editable", function() {
    if ($(this).index() === 0) return;
    $("td").removeClass("selected");
    $(this).addClass("selected");
    selectedCell = $(this);
    selectedActivityIndex = buscarActividadPorCelda($(this));
  });
  
  // Evento de doble clic: Abrir modal de edición
  $("#horariosBody").on("dblclick", "td.editable", function() {
    if ($(this).index() === 0) return;
    let idx = buscarActividadPorCelda($(this));
    if (idx >= 0) {
      selectedActivityIndex = idx;
      // Rellenar modal con los datos actuales de la actividad
      $("#editNombre").val(actividades[idx].nombre);
      $("#editColor").val(actividades[idx].color);
      $("#editModal").modal("show");
    } else {
      selectedActivityIndex = null;
    }
  });
  
  // Guardar cambios desde el modal de edición
  $("#saveEditBtn").click(function() {
    if (selectedActivityIndex !== null) {
      let nuevoNombre = $("#editNombre").val().trim();
      let nuevoColor = $("#editColor").val();
      if(nuevoNombre === "") {
        alert("El nombre no puede estar vacío.");
        return;
      }
      actividades[selectedActivityIndex].nombre = nuevoNombre;
      actividades[selectedActivityIndex].color = nuevoColor;
      $("#editModal").modal("hide");
      construirTabla();
    }
  });
  
  // Botón Agregar Actividad
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
    agregarActividad(nombre, dia, horaInicio, horaFin, color);
  });
  
  // Botón Eliminar Actividad
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
  
  // Botón Capturar la tabla como imagen
  $("#capturarBtn").click(function() {
    html2canvas(document.querySelector("#tablaHorarios")).then(function(canvas) {
      let link = document.createElement("a");
      link.download = "horarios.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });
  
  // Mostrar/Ocultar instrucciones
  $(".instructions").click(function() {
    $(".instructions-list").slideToggle("slow");
    $(this).find("i").toggleClass("right");
  });
});
