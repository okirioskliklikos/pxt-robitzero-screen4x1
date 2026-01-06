/**
* makecode Four Digit Display (TM1637) Package.
* From microbit/micropython Chinese community.
* http://www.micropython.org.cn
*/

enum TM1637Port {
    //% block="P1/P2"
    P1P2 = KeyestudioPort.P1P2,

    //% block="P8/P3/P4"
    P8P3P4 = KeyestudioPort.P8P3P4,

    //% block="P6/P7"
    P6P7 = KeyestudioPort.P6P7
}

/**
 * Four Digit Display
 */
//% block="Screen 4x1"
//% weight=5 color=#CC5500 icon="\uf0a9"
namespace rb0screen4 {
    let TM1637_CMD1 = 0x40;
    let TM1637_CMD2 = 0xC0;
    let TM1637_CMD3 = 0x80;
    let _SEGMENTS = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];

    /**
     * TM1637 LED display
     */
    class TM1637LEDs {
        buf: Buffer;
        clk: DigitalPin;
        dio: DigitalPin;
        _ON: number;
        brightness: number;
        count: number;  // number of LEDs

        /**
         * initial TM1637
         */
        init(): void {
            pins.digitalWritePin(this.clk, 0);
            pins.digitalWritePin(this.dio, 0);
            this._ON = 8;
            this.buf = pins.createBuffer(this.count);
            this.clear();
        }

        /**
         * Start 
         */
        _start() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 0);
        }

        /**
         * Stop
         */
        _stop() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.dio, 1);
        }

        /**
         * send command1
         */
        _write_data_cmd() {
            this._start();
            this._write_byte(TM1637_CMD1);
            this._stop();
        }

        /**
         * send command3
         */
        _write_dsp_ctrl() {
            this._start();
            this._write_byte(TM1637_CMD3 | this._ON | this.brightness);
            this._stop();
        }

        /**
         * send a byte to 2-wire interface
         */
        _write_byte(b: number) {
            for (let i = 0; i < 8; i++) {
                pins.digitalWritePin(this.dio, (b >> i) & 1);
                pins.digitalWritePin(this.clk, 1);
                pins.digitalWritePin(this.clk, 0);
            }
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.clk, 0);
        }

        /**
         * set TM1637 intensity, range is [0-8], 0 is off.
         * @param val the brightness of the TM1637, eg: 7
         */
        //% blockId="TM1637_set_intensity" block="%tm|set intensity %val"
        //% weight=50 blockGap=8
        //% parts="TM1637"
        intensity(val: number = 7) {
            if (val < 1) {
                this.off();
                return;
            }
            if (val > 8) val = 8;
            this._ON = 8;
            this.brightness = val - 1;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * set data to TM1637, with given bit
         */
        _dat(bit: number, dat: number) {
            this._write_data_cmd();
            this._start();
            this._write_byte(TM1637_CMD2 | (bit % this.count))
            this._write_byte(dat);
            this._stop();
            this._write_dsp_ctrl();
        }

        /**
         * show a number in given position. 
         * @param num number will show, eg: 5
         * @param bit the position of the LED, eg: 0
         */
        //% blockId="TM1637_showbit" block="%tm|show digit %num |at %bit"
        //% weight=90 blockGap=8
        //% parts="TM1637"
        showbit(num: number = 5, bit: number = 0) {
            this.buf[bit % this.count] = _SEGMENTS[num % 16]
            this._dat(bit, _SEGMENTS[num % 16])
        }

        /**
          * show a number. 
          * @param num is a number, eg: 0
          */
        //% blockId="TM1637_shownum" block="%tm|show number %num"
        //% weight=91 blockGap=8
        //% parts="TM1637"
        showNumber(num: number) {
            let digit = 0;
            let inStart = true;
            let iNum = num;

            if (num > 9999 || num < -999) {
                this.showHex(65535) // Out of boundaries, show 0xFFFF error
                return;
            }

            if (num < 0) {
                num = -num
            }

            //digit pos [0]
            digit = Math.idiv(num, 1000) % 10
            if (!(digit === 0 && inStart)) {
                this.showbit(digit)
                inStart = false;
            } else {
                this.clearDigit(0);
            }

            //digit pos [1]
            digit = Math.idiv(num, 100) % 10
            if (!(digit === 0 && inStart)) {
                this.showbit(digit, 1)
                inStart = false;
            } else {
                this.clearDigit(1);
            }

            //digit pos [2]
            digit = Math.idiv(num, 10) % 10
            if (!(digit === 0 && inStart)) {
                this.showbit(digit, 2)
                inStart = false;
            } else {
                this.clearDigit(2);
            }

            //digit pos [3]
            this.showbit(num % 10, 3)

            // show '-' for negative numbers
            if (iNum < 0) {
                if (iNum < -99) {
                    this._dat(0, 0x40) // '-'
                } else if (iNum < -9) {
                    this._dat(1, 0x40) // '-'
                } else {
                    this._dat(2, 0x40) // '-'
                }
            }
        }

        /**
          * show a hex number. 
          * @param num is a hex number, eg: 0
          */
        //% blockId="TM1637_showhex" block="%tm|show hex number %num"
        //% weight=90 blockGap=8
        //% parts="TM1637"
        showHex(num: number) {
            if (num < 0) {
                this._dat(0, 0x40) // '-'
                num = -num
            }
            else
                this.showbit((num >> 12) % 16)
            this.showbit(num % 16, 3)
            this.showbit((num >> 4) % 16, 2)
            this.showbit((num >> 8) % 16, 1)
        }

        /**
         * show or hide dot point. 
         * @param bit is the position, eg: 1
         * @param show is show/hide dp, eg: true
         */
        //% blockId="TM1637_showDP" block="%tm|DotPoint at %bit|show %show"
        //% weight=70 blockGap=8
        //% parts="TM1637"
        showDP(bit: number = 1, show: boolean = true) {
            bit = bit % this.count
            if (show) this._dat(bit, this.buf[bit] | 0x80)
            else this._dat(bit, this.buf[bit] & 0x7F)
        }

        /**
         * clear LED. 
         */
        //% blockId="TM1637_clear" block="clear %tm"
        //% weight=80 blockGap=8
        //% parts="TM1637"
        clear() {
            for (let i = 0; i < this.count; i++) {
                this.clearDigit(i)
            }
        }

        private clearDigit(pos: number = 0) {
            this._dat(pos, 0)
            this.buf[pos] = 0
        }

        /**
         * turn on LED. 
         */
        //% blockId="TM1637_on" block="turn on %tm"
        //% weight=86 blockGap=8
        //% parts="TM1637"
        on() {
            this._ON = 8;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * turn off LED. 
         */
        //% blockId="TM1637_off" block="turn off %tm"
        //% weight=85 blockGap=8
        //% parts="TM1637"
        off() {
            this._ON = 0;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }
    }

    /**
     * create a TM1637 object.
     * @param clk the CLK pin for TM1637, eg: DigitalPin.P1
     * @param dio the DIO pin for TM1637, eg: DigitalPin.P2
     * @param intensity the brightness of the LED, eg: 7
     * @param count the count of the LED, eg: 4
     */
    // weight=200 blockGap=8
    // blockId="TM1637_create" block="DIO %dio|CLK %clk|intensity %intensity|LED count %count"
    /*export function create(dio: DigitalPin, clk: DigitalPin, intensity: number, count: number): TM1637LEDs {
        let tm = new TM1637LEDs();
        tm.clk = clk;
        tm.dio = dio;
        if ((count < 1) || (count > 5)) count = 4;
        tm.count = count;
        tm.brightness = intensity;
        tm.init();
        return tm;
    }*/

    let rb0scr4: TM1637LEDs;

    /**
    * Initialize 4Digit Screen based on TM1637 
    * @param port Keyestudio port that TM1367 screen is connected
    */
    //% blockId="rb0screen4_simplecreate"
    //% block="screen 4x1 at port %port" 
    //% weight=90 color=100 blockGap=24
    //% port.defl=TM1637Port.P8P3P4
    export function rb0screen4_simplecreate(port: TM1637Port) {
        let ksPort = port as number as KeyestudioPort;

        let pin1 = rb0base.getPinFromKeyestudioPort(ksPort);
        rb0base.enablePin(pin1);

        let pin2 = rb0base.getPinFromKeyestudioPort(ksPort, 2);
        rb0base.enablePin(pin2);

        rb0scr4 = new TM1637LEDs();
        rb0scr4.dio = pin1;
        rb0scr4.clk = pin2;
        rb0scr4.count = 4;
        rb0scr4.brightness = 7;
        rb0scr4.init();
    }

    /**
    * Initialize 4Digit Screen based on TM1637 
    * @param pin1 pin port that DIO of TM1367 screen is connected
    * @param pin2 pin port that CLK of TM1367 screen is connected
    */
    //% blockId="rb0screen4_advancedcreate"
    //% block="screen 4x1 at DIO %pin1 CLK %pin2" 
    //% weight=90 color=100 blockGap=24 advanced=true
    //% pin1.defl=DigitalPin.P8 pin2.defl=DigitalPin.P3
    export function rb0screen4_advancedcreate(pin1: DigitalPin, pin2: DigitalPin) {
        rb0base.enablePin(pin1);
        rb0base.enablePin(pin2);

        rb0scr4 = new TM1637LEDs();
        rb0scr4.dio = pin1;
        rb0scr4.clk = pin2;
        rb0scr4.count = 4;
        rb0scr4.brightness = 7;
        rb0scr4.init();
    }

    /**
    * show a number. 
    * @param num is a number, eg: 0
    */
    //% blockId="rb0screen4_shownum"
    //% block="screen 4x1 show number %num"
    //% weight=80 blockGap=8
    export function showNumber(num: number) {
        rb0scr4.showNumber(num);
    }

    /**
    * show a hex number. 
    * @param num is a hex number, eg: 0
     */
    //% blockId="rb0screen4_showhex"
    //% block="screen 4x1 show hex number %num"
    //% weight=80 blockGap=8 advanced=true
    export function showHex(num: number) {
        rb0scr4.showHex(num);
    }
}
// Προσθέστε τον κώδικά σας εδώ
