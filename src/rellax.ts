// Default Settings
const __DEFAULTS__: ParallaxOptions = {
  speed: -2,
  verticalSpeed: null,
  horizontalSpeed: null,
  breakpoints: [576, 768, 1201],
  center: false,
  wrapper: null,
  relativeToWrapper: false,
  round: true,
  vertical: true,
  horizontal: false,
  verticalScrollAxis: 'y',
  horizontalScrollAxis: 'x',
  callback: () => {},
};

export type ParallaxOptions = {
  speed?: number;
  verticalSpeed?: null | number;
  horizontalSpeed?: null | number;
  breakpoints?: number[];
  center?: boolean;
  wrapper?: null | HTMLElement;
  relativeToWrapper?: boolean;
  round?: boolean;
  vertical?: boolean;
  horizontal?: boolean;
  verticalScrollAxis?: string;
  horizontalScrollAxis?: string;
  callback?: () => void;
};

export class ParallaxManager {
  private posY = 0;
  private screenY = 0;
  private posX = 0;
  private screenX = 0;
  private blocks: HTMLElement[] = [];
  private parallaxElements: HTMLElement[] = [];
  private pause = true;
  private options = __DEFAULTS__;
  // set a placeholder for the current breakpoint
  private currentBreakpoint: string | null = null;
  // check what requestAnimationFrame to use, and if
  // it's not supported, use the onscroll event
  private loop: any;
  // store the id for later use
  private loopId = null;
  // check what cancelAnimation method to use
  private clearLoop: ((handle: number) => void) | { (handle?: number): void; (timeoutId: NodeJS.Timeout): void };
  // check which transform property to use
  private transformProp: string | number;
  private supportsPassive = false;

  private validateCustomBreakpoints = () => {
    if (this.options.breakpoints!.length === 3 && Array.isArray(this.options.breakpoints)) {
      let isAscending = true;
      let isNumerical = true;
      let lastVal: number | null;
      this.options.breakpoints.forEach((i) => {
        if (typeof i !== 'number') isNumerical = false;
        if (lastVal !== null) {
          if (i < lastVal) isAscending = false;
        }
        lastVal = i;
      });
      if (isAscending && isNumerical) return;
    }
    // revert defaults if set incorrectly
    this.options.breakpoints = [576, 768, 1201];
    console.warn(
      'ParallaxManager: You must pass an array of 3 numbers in ascending order to the breakpoints option. Defaults reverted',
    );
  };

  // helper to determine current breakpoint
  private getCurrentBreakpoint = (w) => {
    const bp = this.options.breakpoints;
    if (w < bp![0]) return 'xs';
    if (w >= bp![0] && w < bp![1]) return 'sm';
    if (w >= bp![1] && w < bp![2]) return 'md';
    return 'lg';
  };

  // Get and cache initial position of all elements
  private cacheBlocks = () => {
    for (const el of this.parallaxElements) {
      const block = this.createBlock(el);
      this.blocks.push(block);
    }
  };

  // Let's kick this script off
  // Build array for cached element values
  private init = () => {
    for (let i = 0; i < this.blocks.length; i++) {
      this.parallaxElements[i].style.cssText = this.blocks[i].style;
    }

    this.blocks = [];

    this.screenY = window.innerHeight;
    this.screenX = window.innerWidth;
    this.currentBreakpoint = this.getCurrentBreakpoint(screenX);

    this.setPosition();

    this.cacheBlocks();

    this.animate();

    // If paused, unpause and set listener for window resizing events
    if (this.pause) {
      window.addEventListener('resize', this.init);
      this.pause = false;
      // Start the loop
      this.update();
    }
  };

  refresh = this.init;

  // We want to cache the parallax blocks'
  // values: base, top, height, speed
  // el: is dom object, return: el cache values
  private createBlock = (el: HTMLElement) => {
    const dataPercentage = el.getAttribute('data-parallax-percentage');
    const dataSpeed = el.getAttribute('data-parallax-speed');
    const dataXsSpeed = el.getAttribute('data-parallax-xs-speed');
    const dataMobileSpeed = el.getAttribute('data-parallax-mobile-speed');
    const dataTabletSpeed = el.getAttribute('data-parallax-tablet-speed');
    const dataDesktopSpeed = el.getAttribute('data-parallax-desktop-speed');
    const dataVerticalSpeed = el.getAttribute('data-parallax-vertical-speed');
    const dataHorizontalSpeed = el.getAttribute('data-parallax-horizontal-speed');
    const dataVericalScrollAxis = el.getAttribute('data-parallax-vertical-scroll-axis');
    const dataHorizontalScrollAxis = el.getAttribute('data-parallax-horizontal-scroll-axis');
    const dataZindex = el.getAttribute('data-parallax-zindex') || 0;
    const dataMin = el.getAttribute('data-parallax-min');
    const dataMax = el.getAttribute('data-parallax-max');
    const dataMinX = el.getAttribute('data-parallax-min-x');
    const dataMaxX = el.getAttribute('data-parallax-max-x');
    const dataMinY = el.getAttribute('data-parallax-min-y');
    const dataMaxY = el.getAttribute('data-parallax-max-y');
    let mapBreakpoints: Record<string, string | null>;
    let breakpoints = true;

    if (!dataXsSpeed && !dataMobileSpeed && !dataTabletSpeed && !dataDesktopSpeed) {
      breakpoints = false;
    } else {
      mapBreakpoints = {
        xs: dataXsSpeed,
        sm: dataMobileSpeed,
        md: dataTabletSpeed,
        lg: dataDesktopSpeed,
      };
    }

    // initializing at scrollY = 0 (top of browser), scrollX = 0 (left of browser)
    // ensures elements are positioned based on HTML layout.
    //
    // If the element has the percentage attribute, the posY and posX needs to be
    // the current scroll position's value, so that the elements are still positioned based on HTML layout
    let wrapperPosY = this.options.wrapper
      ? this.options.wrapper.scrollTop
      : window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    // If the option relativeToWrapper is true, use the wrappers offset to top, subtracted from the current page scroll.
    if (this.options.relativeToWrapper) {
      const scrollPosY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      wrapperPosY = scrollPosY - this.options.wrapper!.offsetTop;
    }
    this.posY = this.options.vertical ? (dataPercentage || this.options.center ? wrapperPosY : 0) : 0;
    this.posX = this.options.horizontal
      ? dataPercentage || this.options.center
        ? this.options.wrapper
          ? this.options.wrapper.scrollLeft
          : window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft
        : 0
      : 0;

    const blockTop = this.posY + el.getBoundingClientRect().top;
    const blockHeight = el.clientHeight || el.offsetHeight || el.scrollHeight;

    const blockLeft = this.posX + el.getBoundingClientRect().left;
    const blockWidth = el.clientWidth || el.offsetWidth || el.scrollWidth;

    // apparently parallax equation everyone uses
    let percentageY = dataPercentage
      ? dataPercentage
      : (this.posY - blockTop + this.screenY) / (blockHeight + this.screenY);
    let percentageX = dataPercentage
      ? dataPercentage
      : (this.posX - blockLeft + this.screenX) / (blockWidth + this.screenX);
    if (this.options.center) {
      percentageX = 0.5;
      percentageY = 0.5;
    }

    // Optional individual block speed as data attr, otherwise global speed
    const speed =
      breakpoints && mapBreakpoints[this.currentBreakpoint] !== null
        ? Number(mapBreakpoints[this.currentBreakpoint])
        : dataSpeed
        ? dataSpeed
        : this.options.speed;
    const verticalSpeed = dataVerticalSpeed ? dataVerticalSpeed : this.options.verticalSpeed;
    const horizontalSpeed = dataHorizontalSpeed ? dataHorizontalSpeed : this.options.horizontalSpeed;

    // Optional individual block movement axis direction as data attr, otherwise global movement direction
    const verticalScrollAxis = dataVericalScrollAxis ? dataVericalScrollAxis : this.options.verticalScrollAxis;
    const horizontalScrollAxis = dataHorizontalScrollAxis
      ? dataHorizontalScrollAxis
      : this.options.horizontalScrollAxis;

    const bases = this.updatePosition(percentageX, percentageY, speed, verticalSpeed, horizontalSpeed);

    // ~~Store non-translate3d transforms~~
    // Store inline styles and extract transforms
    const style = el.style.cssText;
    let transform = '';

    // Check if there's an inline styled transform
    const searchResult = /transform\s*:/i.exec(style);
    if (searchResult) {
      // Get the index of the transform
      const index = searchResult.index;

      // Trim the style to the transform point and get the following semi-colon index
      const trimmedStyle = style.slice(index);
      const delimiter = trimmedStyle.indexOf(';');

      // Remove "transform" string and save the attribute
      if (delimiter) {
        transform = ' ' + trimmedStyle.slice(11, delimiter).replace(/\s/g, '');
      } else {
        transform = ' ' + trimmedStyle.slice(11).replace(/\s/g, '');
      }
    }

    return {
      baseX: bases.x,
      baseY: bases.y,
      top: blockTop,
      left: blockLeft,
      height: blockHeight,
      width: blockWidth,
      speed,
      verticalSpeed,
      horizontalSpeed,
      verticalScrollAxis,
      horizontalScrollAxis,
      style,
      transform,
      zindex: dataZindex,
      min: dataMin,
      max: dataMax,
      minX: dataMinX,
      maxX: dataMaxX,
      minY: dataMinY,
      maxY: dataMaxY,
    };
  };

  private supportPassive = () => {
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: () => {
          this.supportsPassive = true;
        },
      });
      window.addEventListener('testPassive', null, opts);
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {}
  };

  // set scroll position (posY, posX)
  // side effect method is not ideal, but okay for now
  // returns true if the scroll changed, false if nothing happened
  private setPosition = function () {
    const oldY = this.posY;
    const oldX = this.posX;

    this.posY = this.options.wrapper
      ? this.options.wrapper.scrollTop
      : ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollTop ||
        window.pageYOffset;

    this.posX = this.options.wrapper
      ? this.options.wrapper.scrollLeft
      : ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollLeft ||
        window.pageXOffset;

    // If option relativeToWrapper is true, use relative wrapper value instead.
    if (this.options.relativeToWrapper) {
      const scrollPosY =
        ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollTop ||
        window.pageYOffset;
      this.posY = scrollPosY - this.options.wrapper.offsetTop;
    }

    if (oldY != this.posY && this.options.vertical) {
      // scroll changed, return true
      return true;
    }

    if (oldX != this.posX && this.options.horizontal) {
      // scroll changed, return true
      return true;
    }

    // scroll did not change
    return false;
  };

  // Ahh a pure function, gets new transform value
  // based on scrollPosition and speed
  // Allow for decimal pixel values
  private updatePosition = (percentageX, percentageY, speed, verticalSpeed, horizontalSpeed) => {
    const result = { x: 0, y: 0 };
    const valueX = (horizontalSpeed ? horizontalSpeed : speed) * (100 * (1 - percentageX));
    const valueY = (verticalSpeed ? verticalSpeed : speed) * (100 * (1 - percentageY));

    result.x = this.options.round ? Math.round(valueX) : Math.round(valueX * 100) / 100;
    result.y = this.options.round ? Math.round(valueY) : Math.round(valueY * 100) / 100;

    return result;
  };

  // Remove event listeners and loop again
  private deferredUpdate = () => {
    window.removeEventListener('resize', this.deferredUpdate);
    window.removeEventListener('orientationchange', this.deferredUpdate);
    (this.options.wrapper ?? window).removeEventListener('scroll', this.deferredUpdate);
    (this.options.wrapper ?? document).removeEventListener('touchmove', this.deferredUpdate);

    // loop again
    this.loopId = this.loop(this.update);
  };

  // Loop
  private update = () => {
    if (this.setPosition() && this.pause === false) {
      this.animate();

      // loop again
      this.loopId = this.loop(this.update);
    } else {
      this.loopId = null;

      // Don't animate until we get a position updating event
      window.addEventListener('resize', this.deferredUpdate);
      window.addEventListener('orientationchange', this.deferredUpdate);
      (this.options.wrapper ?? window).addEventListener(
        'scroll',
        this.deferredUpdate,
        this.supportsPassive ? { passive: true } : false,
      );
      (this.options.wrapper ?? document).addEventListener(
        'touchmove',
        this.deferredUpdate,
        this.supportsPassive ? { passive: true } : false,
      );
    }
  };

  // Transform3d on parallax element
  private animate = () => {
    let positions;
    for (let i = 0; i < this.parallaxElements.length; i++) {
      // Determine relevant movement directions
      const verticalScrollAxis = this.blocks[i].verticalScrollAxis.toLowerCase();
      const horizontalScrollAxis = this.blocks[i].horizontalScrollAxis.toLowerCase();
      const verticalScrollX = verticalScrollAxis.indexOf('x') != -1 ? this.posY : 0;
      const verticalScrollY = verticalScrollAxis.indexOf('y') != -1 ? this.posY : 0;
      const horizontalScrollX = horizontalScrollAxis.indexOf('x') != -1 ? this.posX : 0;
      const horizontalScrollY = horizontalScrollAxis.indexOf('y') != -1 ? this.posX : 0;

      const percentageY =
        (verticalScrollY + horizontalScrollY - this.blocks[i].top + this.screenY) /
        (this.blocks[i].height + this.screenY);
      const percentageX =
        (verticalScrollX + horizontalScrollX - this.blocks[i].left + this.screenX) /
        (this.blocks[i].width + this.screenX);

      // Subtracting initialize value, so element stays in same spot as HTML
      positions = this.updatePosition(
        percentageX,
        percentageY,
        this.blocks[i].speed,
        this.blocks[i].verticalSpeed,
        this.blocks[i].horizontalSpeed,
      );
      let positionY = positions.y - this.blocks[i].baseY;
      let positionX = positions.x - this.blocks[i].baseX;

      // The next two "if" blocks go like this:
      // Check if a limit is defined (first "min", then "max");
      // Check if we need to change the Y or the X
      // (Currently working only if just one of the axes is enabled)
      // Then, check if the new position is inside the allowed limit
      // If so, use new position. If not, set position to limit.

      // Check if a min limit is defined
      if (this.blocks[i].min !== null) {
        if (this.options.vertical && !this.options.horizontal) {
          positionY = positionY <= this.blocks[i].min ? this.blocks[i].min : positionY;
        }
        if (this.options.horizontal && !this.options.vertical) {
          positionX = positionX <= this.blocks[i].min ? this.blocks[i].min : positionX;
        }
      }

      // Check if directional min limits are defined
      if (this.blocks[i].minY != null) {
        positionY = positionY <= this.blocks[i].minY ? this.blocks[i].minY : positionY;
      }
      if (this.blocks[i].minX != null) {
        positionX = positionX <= this.blocks[i].minX ? this.blocks[i].minX : positionX;
      }

      // Check if a max limit is defined
      if (this.blocks[i].max !== null) {
        if (this.options.vertical && !this.options.horizontal) {
          positionY = positionY >= this.blocks[i].max ? this.blocks[i].max : positionY;
        }
        if (this.options.horizontal && !this.options.vertical) {
          positionX = positionX >= this.blocks[i].max ? this.blocks[i].max : positionX;
        }
      }

      // Check if directional max limits are defined
      if (this.blocks[i].maxY != null) {
        positionY = positionY >= this.blocks[i].maxY ? this.blocks[i].maxY : positionY;
      }
      if (this.blocks[i].maxX != null) {
        positionX = positionX >= this.blocks[i].maxX ? this.blocks[i].maxX : positionX;
      }

      const zindex = this.blocks[i].zindex;

      // Move that element
      // (Set the new translation and append initial inline transforms.)
      const translate =
        'translate3d(' +
        (this.options.horizontal ? positionX : '0') +
        'px,' +
        (this.options.vertical ? positionY : '0') +
        'px,' +
        zindex +
        'px) ' +
        this.blocks[i].transform;
      this.parallaxElements[i].style[this.transformProp] = translate;
    }
    this.options.callback(positions);
  };

  destroy = () => {
    for (let i = 0; i < this.parallaxElements.length; i++) {
      this.parallaxElements[i].style.cssText = this.blocks[i].style;
    }

    // Remove resize event listener if not pause, and pause
    if (!this.pause) {
      window.removeEventListener('resize', this.init);
      this.pause = true;
    }

    // Clear the animation loop to prevent possible memory leak
    this.clearLoop(this.loopId);
    this.loopId = null;
  };

  private fakeAnimationFrame = (callback) => {
    return setTimeout(callback, 1000 / 60);
  };

  constructor(el: string | HTMLElement | string[] | HTMLElement[], options?: ParallaxOptions) {
    // User defined options (might have more in the future)
    if (options) {
      this.options = Object.assign(__DEFAULTS__, options) as typeof __DEFAULTS__;
    }

    this.loop =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      // @ts-ignore
      window.msRequestAnimationFrame ||
      // @ts-ignore
      window.oRequestAnimationFrame ||
      this.fakeAnimationFrame;

    // check what cancelAnimation method to use
    this.clearLoop = window.cancelAnimationFrame || window.mozCancelAnimationFrame || clearTimeout;

    // check which transform property to use
    this.transformProp =
      // @ts-ignore
      window.transformProp ||
      (function () {
        const testEl = document.createElement('div');
        if (testEl.style.transform === null) {
          const vendors = ['Webkit', 'Moz', 'ms'];
          for (const vendor in vendors) {
            if (testEl.style[vendors[vendor] + 'Transform'] !== undefined) {
              return vendors[vendor] + 'Transform';
            }
          }
        }
        return 'transform';
      })();

    if (options && options.breakpoints) {
      this.validateCustomBreakpoints();
    }

    // By default, parallax class
    if (!el) {
      el = '.parallax';
    }

    let elements: HTMLElement[] = [];

    // check if el is an array on classNames or nodes
    if (Array.isArray(el)) {
      el.forEach((element: string | HTMLElement) => {
        // check if el is a className or a node
        const temp = (typeof element === 'string' ? document.querySelectorAll(element) : [element]) as HTMLElement[];
        temp.forEach((tempEl) => {
          elements.push(tempEl);
        });
      });
    } else {
      // check if el is a className or a node
      elements = (typeof el === 'string' ? document.querySelectorAll(el) : [el]) as HTMLElement[];
    }

    // Now query selector
    if (elements.length > 0) {
      this.parallaxElements = elements;
    }

    // The elements don't exist
    else {
      console.warn("ParallaxManager: The elements you're trying to select don't exist.");
      return;
    }

    // Has a wrapper and it exists
    if (this.options.wrapper) {
      if (!this.options.wrapper.nodeType) {
        // @ts-ignore
        const wrapper = document.querySelector(this.options.wrapper);

        if (wrapper) {
          this.options.wrapper = wrapper;
        } else {
          console.warn("ParallaxManager: The wrapper you're trying to use doesn't exist.");
          return;
        }
      }
    }

    // Init
    this.init();
  }
}
