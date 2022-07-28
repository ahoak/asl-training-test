export function getRoot(element, shadow = false) {
	if (shadow) {
		element.attachShadow({ mode: "open" }); // sets and returns 'this.shadowRoot'
		return element.shadowRoot;
	} else {
		return element
	}
}

export function applyTemplate(element, templateContent, shadow = false) {
	const root = getRoot(element, shadow)
	root.innerHTML = templateContent
	return root
}
