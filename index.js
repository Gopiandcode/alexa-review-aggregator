const webdriver = require('selenium-webdriver');

const driver = new webdriver.Builder().
	withCapabilities(webdriver.Capabilities.chrome()).
	build();

driver.get('http://www.google.com');
driver.findElement(webdriver.By.name('btnK')).then((elem) => {
	elem.getText().then(function(textvalue) {
		console.log(textvalue);
	});
});
