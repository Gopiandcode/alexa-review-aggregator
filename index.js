const webdriver = require('selenium-webdriver');
const promise = require('selenium-webdriver').promise;
const until = webdriver.until;
const signin_data = require('./auth/amazon_cred');
const db = require('./db');

const driver = new webdriver.Builder().
	withCapabilities(webdriver.Capabilities.chrome()).
	build();

function navigateToAlexaSkills(driver, callback) {
	driver.get('http://alexa.amazon.co.uk/');
	driver.findElement(webdriver.By.name('email')).sendKeys(signin_data.username).then(() => {
		driver.findElement(webdriver.By.name('password')).sendKeys(signin_data.password).then(() => {
			driver.findElement(webdriver.By.id('signInSubmit')).click().then(() => {
				let apps = webdriver.By.id('iApps');
				driver.wait(until.elementLocated(apps)).then(() => {
					driver.sleep(1000).then(() => {
					driver.wait(until.elementIsEnabled(driver.findElement(apps))).then(() => {
						driver.findElement(webdriver.By.id('iApps')).click().then(() => {
							driver.wait(until.elementLocated(webdriver.By.id('a2s-search-input', 10000))).then(() => {
							driver.wait(until.elementIsVisible(driver.findElement(webdriver.By.id('a2s-search-input', 10000)))).then(() => {
								callback(driver);
							});
						});
						});
					});
				});
				});
			});
		});
	});
}


function performSearch(driver, text, callback) {
	driver.findElement(webdriver.By.id('a2s-search-input')).sendKeys(text).then(() => {
		driver.findElement(webdriver.By.css('#a2s-search-form > div.a2s-text-bar-right > div')).click().then(() => {
			driver.wait(until.elementLocated(webdriver.By.css('#a2s-search-form > div.a2s-text-bar-right > div'))).then(() => {
				driver.wait(until.elementIsVisible(driver.findElement(webdriver.By.css('#a2s-search-form > div.a2s-text-bar-right > div')))).then(() => {
					callback(driver);
				});
			});
		});
	});

}


function foreachSearchResult(driver, callback) {
	driver.findElements(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div.a2s-list-region > ul > li')).then((elems) => {
		let pendinghtml = elems.map((elem) => { return parseSearchResult(driver, elem); });
		promise.all(pendinghtml).then((allHtml) => {
			let str = JSON.stringify(allHtml);
			console.log(str);
		});
	});
}

function parseSearchResult(driver, elem) {
	return elem.findElement(webdriver.By.className('skill-name')).click().then(() => {
		return driver.findElement(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div > section.skill-detail-header > section > div.skill-info > h2')).then((textitem) => {
			return textitem.getText().then((skillname) => {
				return driver.findElement(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > section.skill-info-region > div > ul > div > div.text-component.mode-sub-section > p')).then((descitem) => {
					return descitem.getText().then((description) => {
						db.storeskill(skillname, description);
						return driver.findElements(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > section.skill-sample-utterances > div > ul > li')).then((phraseitems) => {
							return promse.all(phraseitems.map((phraseelem) => {
									return phraseelem.getText().then((phrase) => {
										db.storephrase(skillname, phrase);
									});
							})).then(() => {
								return driver.findElement(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > section.skill-reviews-region > div > ul > div > div.text-component.mode-sub-section.type-navigation.type-secondary > h4')).click().then(() => {
									return driver.findElements(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div.a2s-list-region > ul > li')).then((elements) => {
										return promise.all(elements.map((item) => {
											return item.findElements(webdriver.By('div > div > div.a2s-star-rating-region > div > div > span > i')).then((scoreitems) => {
												let score = scoreitems.length;
												return item.findElement(webdriver.By('div > div > div.a2s-review-text-region > div > p')).then((reviewtext) => {
													reviewtext.getText().then((reveiw_text) => {
														db.storereview(skillname, score || 0, reviewtext);
													});
												});
											});
										})).then(()=> {
												driver.navigate().back().then(() => {
													driver.navigate().back();
												});
										});
									});
								});
							});
						});
					})
				});
			})
		});
	});
}

navigateToAlexaSkills(driver, (driver) => {
	performSearch(driver, "smoking", (driver) => {
		foreachSearchResult(driver);
	});
});

