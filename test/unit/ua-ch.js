const assert = require('assert');
const { UAParser } = require('../../src/main/ua-parser');

describe('Map UA-CH headers', () => {

    const headers = {
        'sec-ch-ua' : '"Chromium";v="93", "Google Chrome";v="93", " Not;A Brand";v="99"',
        'sec-ch-ua-full-version-list' : '"Chromium";v="93.0.1.2", "Google Chrome";v="93.0.1.2", " Not;A Brand";v="99.0.1.2"',
        'sec-ch-ua-arch' : '"arm"',
        'sec-ch-ua-bitness' : '"64"',
        'sec-ch-ua-mobile' : '?1',
        'sec-ch-ua-model' : '"Pixel 99"',
        'sec-ch-ua-platform' : '"Windows"',
        'sec-ch-ua-platform-version' : '"13"',
        'user-agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    };
    
    let uap = UAParser(headers).withClientHints();
    let browser = new UAParser(headers).getBrowser().withClientHints();
    let cpu = new UAParser(headers).getCPU().withClientHints();
    let device = new UAParser(headers).getDevice().withClientHints();
    let engine = new UAParser(headers).getEngine().withClientHints();
    let os = new UAParser(headers).getOS().withClientHints();

    it('Can read from client-hints headers using `withClientHints()`', () => {  

        assert.strictEqual(uap.ua, "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36");
        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, "93.0.1.2");
        assert.strictEqual(uap.browser.major, "93");        
        assert.strictEqual(browser.name, "Chrome");
        assert.strictEqual(browser.version, "93.0.1.2");
        assert.strictEqual(browser.major, "93");
        assert.strictEqual(uap.cpu.architecture, "arm64");
        assert.strictEqual(cpu.architecture, "arm64");
        assert.strictEqual(uap.device.type, "mobile");
        assert.strictEqual(uap.device.model, "Pixel 99");
        assert.strictEqual(uap.device.vendor, "Google");
        assert.strictEqual(device.type, "mobile");
        assert.strictEqual(device.model, "Pixel 99");
        assert.strictEqual(device.vendor, "Google");
        assert.strictEqual(uap.engine.name, 'Blink');
        assert.strictEqual(uap.engine.version, '93.0.1.2');
        assert.strictEqual(engine.name, 'Blink');
        assert.strictEqual(engine.version, '93.0.1.2');
        assert.strictEqual(uap.os.name, "Windows");
        assert.strictEqual(uap.os.version, "11");
        assert.strictEqual(os.name, "Windows");
        assert.strictEqual(os.version, "11");
    });

    it('Only read from user-agent header when called without `withClientHints()`', () => { 

        uap = UAParser(headers);
        browser = new UAParser(headers).getBrowser();
        cpu = new UAParser(headers).getCPU();
        device = new UAParser(headers).getDevice();
        engine = new UAParser(headers).getEngine();
        os = new UAParser(headers).getOS();

        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, "110.0.0.0");
        assert.strictEqual(uap.browser.major, "110");
        assert.strictEqual(uap.cpu.architecture, "amd64");
        assert.strictEqual(uap.device.type, undefined);
        assert.strictEqual(uap.device.model, undefined);
        assert.strictEqual(uap.device.vendor, undefined);
        assert.strictEqual(uap.engine.name, 'Blink');
        assert.strictEqual(uap.engine.version, '110.0.0.0');
        assert.strictEqual(uap.os.name, "Linux");
        assert.strictEqual(uap.os.version, "x86_64");
    });

    it('Fallback to user-agent header when using `withClientHints()` but found no client hints-related headers',  () => {  

        const headers2 = {
            'sec-ch-ua-mobile' : '?1',
            'user-agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        };
        
        uap = UAParser(headers2).withClientHints();

        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, "110.0.0.0");
        assert.strictEqual(uap.browser.major, "110");
        assert.strictEqual(uap.cpu.architecture, "amd64");
        assert.strictEqual(uap.device.type, "mobile");
        assert.strictEqual(uap.device.model, undefined);
        assert.strictEqual(uap.device.vendor, undefined);
        assert.strictEqual(uap.engine.name, 'Blink');
        assert.strictEqual(uap.engine.version, '110.0.0.0');
        assert.strictEqual(uap.os.name, "Linux");
        assert.strictEqual(uap.os.version, "x86_64");
    });

    it('Can detect Apple silicon from client hints data', () => {  

        // https://github.com/faisalman/ua-parser-js/issues/489#issuecomment-1479213579
        const httpHeadersFromAppleSilicon = {
            'sec-ch-ua-arch' : 'arm',
            'sec-ch-ua-platform' : 'macOS',
            'sec-ch-ua-mobile' : '?0',
            'sec-ch-ua' : '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
            'user-agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0'
        };
        
        UAParser(httpHeadersFromAppleSilicon).withClientHints().then(ua => {

            // Only works in Chrome
            /* 
                if (ua.os.is("macOS") && 
                    ua.cpu.is("arm") &&
                    !ua.device.is("mobile") && 
                    !ua.device.is("tablet")) {
                        // possibly an Apple silicon device
                    }
            */

            assert.strictEqual(ua.os.is("macOS"), true);
            assert.strictEqual(ua.cpu.is("arm"), true);            
            assert.strictEqual(ua.device.is("mobile"), false);
            assert.strictEqual(ua.device.is("tablet"), false);
        });
    });

    it('Can detect form-factors from client-hints', () => {  

        const FFVR = {
            'sec-ch-ua-form-factors' : '"VR"'
        };

        const FFEInk = {
            'sec-ch-ua-form-factors' : '"Tablet", "EInk"'
        };

        const FFUnknown = {
            'sec-ch-ua-form-factors' : '"Unknown"'
        };
        
        UAParser(FFVR).withClientHints().then(ua => {
            assert.strictEqual(ua.device.type, 'xr');
        });

        UAParser(FFEInk).withClientHints().then(ua => {
            assert.strictEqual(ua.device.type, 'tablet');
        });


        UAParser(FFUnknown).withClientHints().then(ua => {
            assert.strictEqual(ua.device.type, undefined);
        });
    });

    it('Avoid error on headers variation', () => {  

        const headers2 = {
            'sec-ch-ua' : '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
            'sec-ch-ua-full-version-list' : '"Google Chrome", "Chromium", "Not?A_Brand";v="24.0.0.0"',
            'sec-ch-ua-full-version' : '""',
            'sec-ch-ua-mobile' : '?0',
            'sec-ch-ua-arch' : '""',
            'sec-ch-ua-bitness' : '""',
            'sec-ch-ua-model' : '""',
            'sec-ch-ua-platform' : '"Windows"',
            'sec-ch-ua-platform-version' : '""',
            'sec-ch-ua-wow64' : '?0',
        };
        
        uap = UAParser(headers2).withClientHints();

        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, undefined);
        assert.strictEqual(uap.browser.major, undefined);
    });

    it('Prioritize more specific brand name regardless the order', () => {  

        const headers3a = {
            'sec-ch-ua-full-version-list' : '"Not_A Brand;v=8, Chromium;v=120.0.6099.131, Google Chrome;v=120.0.6099.132"'
        };
        const headers3b = {
            'sec-ch-ua-full-version-list' : '"Chromium;v=120.0.6099.131, Not_A Brand;v=8, Google Chrome;v=120.0.6099.132"'
        };
        const headers3c = {
            'sec-ch-ua-full-version-list' : '"Google Chrome;v=120.0.6099.132, Chromium;v=120.0.6099.131, Not_A Brand;v=8"'
        };
        const headers3d = {
            'sec-ch-ua-full-version-list' : '"Microsoft Edge;v=120.0.6099.133, Google Chrome;v=120.0.6099.132, Chromium;v=120.0.6099.131, Not_A Brand;v=8"'
        };
        const headers3e = {
            'sec-ch-ua-full-version-list' : '"Chromium;v=120.0.6099.131, Google Chrome;v=120.0.6099.132, Microsoft Edge;v=120.0.6099.133, Not_A Brand;v=8"'
        };
        const headers3f = {
            'sec-ch-ua-full-version-list' : '"Not_A Brand;v=8, Microsoft Edge;v=120.0.6099.133, Google Chrome;v=120.0.6099.132, Chromium;v=120.0.6099.131"'
        };
        
        uap = UAParser(headers3a).withClientHints();
        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, "120.0.6099.132");

        uap = UAParser(headers3b).withClientHints();
        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, "120.0.6099.132");

        uap = UAParser(headers3c).withClientHints();
        assert.strictEqual(uap.browser.name, "Chrome");
        assert.strictEqual(uap.browser.version, "120.0.6099.132");

        uap = UAParser(headers3d).withClientHints();
        assert.strictEqual(uap.browser.name, "Edge");
        assert.strictEqual(uap.browser.version, "120.0.6099.133");

        uap = UAParser(headers3e).withClientHints();
        assert.strictEqual(uap.browser.name, "Edge");
        assert.strictEqual(uap.browser.version, "120.0.6099.133");

        uap = UAParser(headers3f).withClientHints();
        assert.strictEqual(uap.browser.name, "Edge");
        assert.strictEqual(uap.browser.version, "120.0.6099.133");
    });
});

describe('Browser naming adjustments', () => {
    [
        {
            ua_ch: '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
            expect: {
                before: 'Google Chrome',
                after: 'Chrome'
            }
        },
        {
            ua_ch: '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
            expect: {
                before: "Microsoft Edge",
                after: "Edge"
            }
        },
        {
            ua_ch: '"Android WebView";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            expect: {
                before: "Android WebView",
                after: "Chrome WebView"
            }
        },
        {
            ua_ch: '"Chromium";v="124", "HeadlessChrome";v="124", "Not-A.Brand";v="99"',
            expect: {
                before: "HeadlessChrome",
                after: "Chrome Headless"
            }
        },
    ]
    .forEach(test => {
        it(`"${test.expect.before}" => "${test.expect.after}"`, () => {
            const headers = {
                'sec-ch-ua' : test.ua_ch,
            };
            const { browser } = UAParser(headers).withClientHints();
            assert.strictEqual(browser.name, test.expect.after);
        });
    });
});

describe('Identify vendor & type of device from given model name', () => {
    [
        {
            model: '220733SG',
            expect: {
                vendor : 'Xiaomi',
                type : 'mobile'
            }
        },
        {
            model: '5087Z',
            expect: {
                vendor : 'TCL',
                type : 'mobile'
            }
        },
        {
            model: '9137W',
            expect: {
                vendor : 'TCL',
                type : 'tablet'
            }
        },
        {
            model: 'BE2015',
            expect: {
                vendor : 'OnePlus',
                type : 'mobile'
            }
        },
        {
            model: 'CPH2389',
            expect: {
                vendor : 'OPPO',
                type : 'mobile'
            }
        },
        {
            model: 'Infinix X669C',
            expect: {
                vendor : 'Infinix',
                type : 'mobile'
            }
        },
        {
            model: 'itel L6502',
            expect: {
                vendor : 'itel',
                type : 'mobile'
            }
        },
        {
            model: 'Lenovo TB-X606F',
            expect: {
                vendor : 'Lenovo',
                type : 'tablet'
            }
        },
        {
            model: 'LM-Q720',
            expect: {
                vendor : 'LG',
                type : 'mobile'
            }
        },
        {
            model: 'M2003J15SC',
            expect: {
                vendor : 'Xiaomi',
                type : 'mobile'
            }
        },
        {
            model: 'MAR-LX1A',
            expect: {
                vendor : 'Huawei',
                type : 'mobile'
            }
        },
        {
            model: 'moto g(20)',
            expect: {
                vendor : 'Motorola',
                type : 'mobile'
            }
        },
        {
            model: 'Nokia C210',
            expect: {
                vendor : 'Nokia',
                type : 'mobile'
            }
        },
        {
            model: 'Pixel 8',
            expect: {
                vendor : 'Google',
                type : 'mobile'
            }
        },
        {
            model: 'Redmi Note 9S',
            expect: {
                vendor : 'Xiaomi',
                type : 'mobile'
            }
        },
        {
            model: 'RMX3830',
            expect: {
                vendor : 'Realme',
                type : 'mobile'
            }
        },
        {
            model: 'SM-S536DL',
            expect: {
                vendor : 'Samsung',
                type : 'mobile'
            }
        },
        {
            model: 'SM-S546VL',
            expect: {
                vendor : 'Samsung',
                type : 'mobile'
            }
        },
        {
            model: 'SM-T875',
            expect: {
                vendor : 'Samsung',
                type : 'tablet'
            }
        },
        {
            model: 'STK-L21',
            expect: {
                vendor : 'Huawei',
                type : 'mobile'
            }
        },
        {
            model: 'T430W',
            expect: {
                vendor : 'TCL',
                type : 'mobile'
            }
        },
        {
            model: 'TECNO KI5k',
            expect: {
                vendor : 'TECNO',
                type : 'mobile'
            }
        },
        {
            model: 'vivo 1820',
            expect: {
                vendor : 'Vivo',
                type : 'mobile'
            }
        },
        {
            model: 'Xbox',
            expect: {
                vendor : 'Microsoft',
                type : 'console'
            }
        }
    ]
    .forEach(test => {
        it(`Solve "${test.model}"`, () => {
            const headers = {
                'sec-ch-ua-model' : test.model,
            };
            const { device } = UAParser(headers).withClientHints();
            assert.strictEqual(device.model, test.model);
            assert.strictEqual(device.vendor, test.expect.vendor);
            assert.strictEqual(device.type, test.expect.type);
        });
    });
});