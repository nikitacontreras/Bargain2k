// ==UserScript==
// @name         Bargain2k
// @namespace    https://content.elltechnologies.com/
// @version      2.5
// @description  Intercepta lesson.JSON, procesa y muestra en treeviews separados para respuestas de Quizzes y Practices.
// @author       nikitacontreras
// @match        https://content.elltechnologies.com/index.html*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/nikitacontreras/Bargain2k/refs/heads/main/bargain2k.js?uc=1
// @downloadURL  https://raw.githubusercontent.com/nikitacontreras/Bargain2k/refs/heads/main/bargain2k.js
// ==/UserScript==

(() => {
	"use strict";

	let lessonData = null;
	let ventanas = {};
	let options = [];

	class processor {
		process(type, response, question = {}) {
			switch (type) {
				case "TAB":
					return this.TAB(question);
				default:
					return this.__DEFAULT(response);
			}
		}

        __DEFAULT(response) {
            return response._data
            .map((data) => data.content)
            .filter((content) => content != null)
            .map((content) => typeof content === 'string' ? content.trim() : content);
        }

		TAB(question) {
			options =
				options.length <= 0
					? question.responses.flatMap((response) =>
							response._data.map((item) => item.content.trim()),
						)
					: options;

			const correctOptions = question.responses
				.map((response, index) => (response.correct ? options[index] : null))
				.filter(Boolean);
			return correctOptions;
		}
	}

	function collectResponsesByType(labs) {
		const quizResponses = {};
		const practiceResponses = {};

		for (const { exercises } of labs) {
			for (const { _data, questions, type } of exercises) {
				const isQuiz = _data.some(
					(item) =>
						item.type === "group" &&
						Array.isArray(item.contents) &&
						item.contents.some((c) => c.content === "Quiz"),
				);
				for (const q of questions) {
					for (const r of q.responses.filter(
						(r) => r.correct === true || r.correct === 1,
					)) {
						const target = isQuiz ? quizResponses : practiceResponses;
						target[type] = target[type] || [];
						target[type].push(...new processor().process(type, r, q));
					}
				}
			}
		}

		return { quizResponses, practiceResponses };
	}

	function createTreeView(data, parentElement) {
		const ul = document.createElement("ul");
		ul.style.listStyleType = "none";
		ul.style.padding = "0";

		for (const key in data) {
			if (!data[key] || data[key].length === 0) continue; // Saltar categorías vacías

			const li = document.createElement("li");

			const summary = document.createElement("details");
			const title = document.createElement("summary");
			title.textContent = key;
			title.style.cursor = "pointer";
			title.style.padding = "5px";
			title.style.borderRadius = "4px";
			title.style.transition = "background-color 0.3s";

			title.addEventListener("mouseover", () => {
				title.style.backgroundColor = "#f0f0f0";
			});

			title.addEventListener("mouseout", () => {
				if (!summary.open) title.style.backgroundColor = "";
			});

			summary.addEventListener("toggle", () => {
				title.style.backgroundColor = summary.open ? "lightgray" : "";
			});

			summary.appendChild(title);

			const value = data[key];

			const detailsUl = document.createElement("ul");
			detailsUl.style.listStyleType = "disc";
			detailsUl.style.paddingLeft = "20px";
			detailsUl.style.backgroundColor = "#f9f9f9";
			detailsUl.style.border = "1px solid #ddd";
			detailsUl.style.marginTop = "5px";

			const arrValue = Array.isArray(value) ? value : [value];
			for (const item of arrValue) {
				const valueLi = document.createElement("li");
				valueLi.textContent = item;
				valueLi.style.paddingLeft = "10px";
				detailsUl.appendChild(valueLi);
			}

			summary.appendChild(detailsUl);
			li.appendChild(summary);
			ul.appendChild(li);
		}
		parentElement.appendChild(ul);
	}

	function crearVentana(id, titulo, data, offsetX = 0, offsetY = 0) {
		if (document.getElementById(id)) return;

		const ventana = document.createElement("div");
		ventana.id = id;
		ventana.style.position = "fixed";
		ventana.style.top = `${50 + offsetY}px`;
		ventana.style.left = `${50 + offsetX}px`;
		ventana.style.width = "400px";
		ventana.style.height = "auto";
		ventana.style.backgroundColor = "white";
		ventana.style.border = "1px solid black";
		ventana.style.zIndex = "10000";
		ventana.style.resize = "both";
		ventana.style.overflow = "auto";

		const titleBar = document.createElement("div");
		titleBar.style.backgroundColor = "#333";
		titleBar.style.color = "white";
		titleBar.style.padding = "5px";
		titleBar.style.cursor = "move";
		titleBar.style.zIndex = "10001";
		titleBar.textContent = titulo;
		titleBar.style.display = "flex";
		titleBar.style.justifyContent = "space-between";
		titleBar.style.alignItems = "center";

		const minimizeButton = document.createElement("button");
		minimizeButton.textContent = "_";
		minimizeButton.style.marginLeft = "auto";
		minimizeButton.style.cursor = "pointer";
		minimizeButton.style.backgroundColor = "transparent";
		minimizeButton.style.border = "none";
		minimizeButton.style.color = "white";

		minimizeButton.addEventListener("click", () => {
			const content = ventana.querySelector(".content");
			if (content.style.display === "none") {
				content.style.display = "block";
				ventana.style.height = "300px";
			} else {
				content.style.display = "none";
				ventana.style.height = "auto";
			}
		});

		titleBar.appendChild(minimizeButton);

		const content = document.createElement("div");
		content.classList.add("content");
		content.style.display = "none";
		content.style.margin = "10px";
		createTreeView(data, content);

		ventana.appendChild(titleBar);
		ventana.appendChild(content);
		document.body.appendChild(ventana);

		ventanas[id] = ventana;

		let isDragging = false;
		let dragOffsetX = 0;
		let dragOffsetY = 0;

		titleBar.addEventListener("mousedown", (e) => {
			isDragging = true;
			dragOffsetX = e.clientX - ventana.offsetLeft;
			dragOffsetY = e.clientY - ventana.offsetTop;
		});

		document.addEventListener("mousemove", (e) => {
			if (isDragging) {
				ventana.style.left = `${e.clientX - dragOffsetX}px`;
				ventana.style.top = `${e.clientY - dragOffsetY}px`;
			}
		});

		document.addEventListener("mouseup", () => {
			isDragging = false;
		});
	}

	const originalXHR = window.XMLHttpRequest;

	function CustomXHR() {
		const xhr = new originalXHR();
		const originalOpen = xhr.open;

		xhr.open = function (method, url, ...rest) {
			if (url.includes("/lesson.JSON")) {
				this.isLessonRequest = true;
			}
			originalOpen.call(this, method, url, ...rest);
		};

		const originalOnReadyStateChange = xhr.onreadystatechange;

		xhr.onreadystatechange = function () {
			if (
				this.readyState === 4 &&
				this.isLessonRequest &&
				this.status === 200
			) {
				try {
					lessonData = JSON.parse(this.responseText);

					if (lessonData && Array.isArray(lessonData.labs)) {
						const { quizResponses, practiceResponses } = collectResponsesByType(
							lessonData.labs,
						);

						crearVentana("ventana-quiz", "Quiz Answers", quizResponses, 0, 50);
						crearVentana(
							"ventana-practice",
							"Practice Answers",
							practiceResponses,
						);
					} else {
						console.warn("Estructura inesperada en lessonData:", lessonData);
					}
				} catch (error) {
					console.error("Error al procesar lesson.JSON:", error);
				}
			}

			if (originalOnReadyStateChange) {
				originalOnReadyStateChange.apply(this, arguments);
			}
		};

		return xhr;
	}

	window.XMLHttpRequest = CustomXHR;

	document.addEventListener("keydown", (e) => {
		if (e.ctrlKey && e.key === "u") {
			for (const ventana of Object.values(ventanas)) {
				ventana.style.display =
					ventana.style.display === "none" ? "block" : "none";
			}
		}
	});
})();
