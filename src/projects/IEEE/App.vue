<template>
  <div class="ieee-root">
    <div class="container">
      <h1>
        IEEE 754 Floating Point Visualizer
      </h1>
    
    <div class="input-section">
      <div class="input-group">
        <div class="input-label">
          <label for="numberInput">
            {{ inputMode === 'binary' ? 'Binary Input' : 'Decimal Input' }}
            <button 
              class="help-btn" 
              @click="showHelp = !showHelp"
              type="button"
              title="Show input format help"
            >
              ?
            </button>
          </label>
          <input 
            type="text" 
            id="numberInput" 
            v-model="inputValue"
            :placeholder="inputMode === 'binary' ? 'e.g., 100.001, inf, -inf, nan' : 'e.g., -5.25, 123.456, inf, -inf, nan'"
            @input="handleInput"
            @keypress="handleKeypress"
          >
        </div>
        <div class="mode-toggle">
          <button 
            class="mode-btn" 
            :class="{ active: inputMode === 'binary' }"
            @click="setInputMode('binary')"
          >
            Binary
          </button>
          <button 
            class="mode-btn" 
            :class="{ active: inputMode === 'decimal' }"
            @click="setInputMode('decimal')"
          >
            Decimal
          </button>
        </div>
        <div style="display:flex; gap:8px; align-items:flex-end;">
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="margin:0;">Sign</label>
            <div style="display:flex; gap:4px;">
              <button type="button" class="format-btn" :class="{ active: inputValue.startsWith('-')===false }" @click="setSign('+')">+</button>
              <button type="button" class="format-btn" :class="{ active: inputValue.startsWith('-') }" @click="setSign('-')">-</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Help Popup -->
      <div v-if="showHelp" class="help-popup">
        <div class="help-header">
          <h4>Input Format Guide</h4>
          <button class="close-btn" @click="showHelp = false">×</button>
        </div>
        <div class="help-content">
          <div class="help-section">
            <h5>Binary Numbers</h5>
            <ul>
              <li><code>101</code> - Integer binary (5 in decimal)</li>
              <li><code>101.11</code> - Binary with fractional part (5.75 in decimal)</li>
              <li><code>1100011000000</code> - Long binary integer</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h5>Decimal Numbers</h5>
            <ul>
              <li><code>5.25</code> - Positive decimal</li>
              <li><code>-5.25</code> - Negative decimal</li>
              <li><code>123.456</code> - Any decimal number</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h5>Special IEEE 754 Values</h5>
            <ul>
              <li><code>inf</code> or <code>infinity</code> - Positive infinity</li>
              <li><code>-inf</code> or <code>-infinity</code> - Negative infinity</li>
              <li><code>nan</code> - Not a Number</li>
            </ul>
          </div>
          
        </div>
      </div>
    </div>

      <div class="visualization" v-html="visualizationHtml"></div>
    </div>
  </div>
</template>

<style src="./style.css"></style>

<script>
import { ref, onMounted, nextTick } from 'vue'

export default {
  name: 'App',
  setup() {
    const inputValue = ref('100.001')
    const visualizationHtml = ref('')
    const currentFormat = ref(32)
    const showHelp = ref(false)
  const inputMode = ref('binary') // 'binary' or 'decimal'
  const signToggle = ref('+')
  const currentBits = ref(0)

    const parseSpecialInput = (str) => {
      const s = str.trim().toLowerCase()
      if (s === 'inf' || s === 'infinity') return Infinity
      if (s === '-inf' || s === '-infinity') return -Infinity
      if (s === 'nan') return NaN
      return null
    }

    const isValidBinary = (str) => {
      const dotCount = (str.match(/\./g) || []).length
      return dotCount <= 1 && /^[01.]+$/.test(str) && str.length > 0
    }

    const binaryToDecimal = (binaryStr) => {
      if (binaryStr.includes('.')) {
        const [integerPart, fractionalPart] = binaryStr.split('.')
        
        let decimal = 0
        if (integerPart) {
          decimal = parseInt(integerPart, 2)
        }
        
        if (fractionalPart) {
          for (let i = 0; i < fractionalPart.length; i++) {
            if (fractionalPart[i] === '1') {
              decimal += Math.pow(2, -(i + 1))
            }
          }
        }
        
        return decimal
      } else {
        return parseInt(binaryStr, 2)
      }
    }

    const generateBinaryConversionSteps = (binaryStr) => {
      if (!binaryStr.includes('.')) {
        const integerPart = binaryStr
        let steps = '<div class="calc-step">Integer part: ' + integerPart + '</div>'
        let calculation = ''
        let total = 0
        
        for (let i = 0; i < integerPart.length; i++) {
          const bit = integerPart[i]
          const power = integerPart.length - 1 - i
          const value = parseInt(bit) * Math.pow(2, power)
          total += value
          
          if (bit === '1') {
            if (calculation) calculation += ' + '
            calculation += `${bit}×2^${power}`
          }
        }
        
        if (calculation) {
          steps += `<div class="calc-step">${calculation} = ${total}</div>`
        }
        
        return steps
      } else {
        const [integerPart, fractionalPart] = binaryStr.split('.')
        let steps = ''
        let totalInteger = 0
        let totalFractional = 0
        
        if (integerPart && integerPart !== '0') {
          steps += '<div class="calc-step">Integer part: ' + integerPart + '</div>'
          let intCalculation = ''
          
          for (let i = 0; i < integerPart.length; i++) {
            const bit = integerPart[i]
            const power = integerPart.length - 1 - i
            const value = parseInt(bit) * Math.pow(2, power)
            totalInteger += value
            
            if (bit === '1') {
              if (intCalculation) intCalculation += ' + '
              intCalculation += `${bit}×2^${power}`
            }
          }
          
          if (intCalculation) {
            steps += `<div class="calc-step">${intCalculation} = ${totalInteger}</div>`
          }
        }
        
        if (fractionalPart) {
          steps += '<div class="calc-step">Fractional part: .' + fractionalPart + '</div>'
          let fracCalculation = ''
          
          for (let i = 0; i < fractionalPart.length; i++) {
            const bit = fractionalPart[i]
            const power = -(i + 1)
            const value = parseInt(bit) * Math.pow(2, power)
            totalFractional += value
            
            if (bit === '1') {
              if (fracCalculation) fracCalculation += ' + '
              fracCalculation += `${bit}×2^${power}`
            }
          }
          
          if (fracCalculation) {
            steps += `<div class="calc-step">${fracCalculation} = ${totalFractional}</div>`
          }
        }
        
        const total = totalInteger + totalFractional
        steps += `<div class="calc-step">Total: ${totalInteger} + ${totalFractional} = ${total}</div>`
        
        return steps
      }
    }

    const buildPlainBinaryFromFields = (sign, actualExp, mantissaBits, isSubnormal) => {
      if (Number.isNaN(actualExp)) return 'NaN'
      if (isSubnormal) {
        // value = 0.fraction * 2^-126 ; produce leading 0.
        const frac = mantissaBits.replace(/0+$/,'') || '0'
        return (sign ? '-' : '') + '0.' + (('0'.repeat(0)) + frac)
      }
      const significand = '1' + mantissaBits
      if (actualExp === 0) {
        const frac = mantissaBits.replace(/0+$/,'') || '0'
        return (sign ? '-' : '') + '1.' + frac
      }
      if (actualExp > 0) {
        if (actualExp >= significand.length - 1) {
          const zeros = '0'.repeat(actualExp - (significand.length - 1))
            return (sign ? '-' : '') + significand + zeros + '.0'
        } else {
          const intPart = significand.slice(0, actualExp + 1)
          const fracPart = significand.slice(actualExp + 1).replace(/0+$/,'')
          return (sign ? '-' : '') + intPart + (fracPart ? '.' + fracPart : '.0')
        }
      }
      // negative exponent: shift point left
      const shift = -actualExp - 1
      const zeros = '0'.repeat(shift)
      const frac = zeros + significand
      const trimmed = frac.replace(/0+$/,'')
      return (sign ? '-' : '') + '0.' + (trimmed || '0')
    }

    // Ensure a binary literal always contains a point, trim trailing zeros after the point, keep the point if no fraction remains.
    const formatBinaryLiteral = (s) => {
      if (!s) return s
      const neg = s.startsWith('-')
      let core = s.replace(/^[+-]/,'')
      // Guarantee a point exists
      if (!core.includes('.')) core += '.'
      // Remove trailing zeros in fraction but preserve point
      core = core.replace(/\.([01]*)$/, (_, frac) => {
        const trimmed = frac.replace(/0+$/,'')
        return trimmed.length ? '.' + trimmed : '.'
      })
      return (neg ? '-' : '+') + core
    }

    const generateFloat32Visualization = (number, binaryInput) => {
      const buffer = new ArrayBuffer(4)
      const view = new DataView(buffer)
      view.setFloat32(0, number)
      const bits = view.getUint32(0)
      currentBits.value = bits
      
      const sign = (bits >>> 31) & 1
      const exponent = (bits >>> 23) & 0xFF
      const mantissa = bits & 0x7FFFFF
      
      const signBit = sign.toString()
      const exponentBits = exponent.toString(2).padStart(8, '0')
      const mantissaBits = mantissa.toString(2).padStart(23, '0')
      
      const biasedExponent = exponent
      const actualExponent = exponent - 127
  const mantissaValue = 1 + mantissa / (2 ** 23)
      
      const bitLabels = Array.from({length: 32}, (_, i) => 31 - i)

      // Build normalized scientific notation (binary) from input or from components
      let normalizedBinary = ''
      let normalizedExponent = actualExponent
      let sourceForNormalization = ''
      const isSpecial = (biasedExponent === 0xFF) || (biasedExponent === 0 && mantissa === 0) // NaN/Inf or zero will still show limited breakdown
      if (typeof binaryInput === 'string' && /^[+-]?[01]+(\.[01]+)?$/.test(binaryInput.trim())) {
        sourceForNormalization = binaryInput.trim()
      } else {
        // Synthesize from bits (normal numbers: implicit leading 1)
        if (biasedExponent !== 0) {
          sourceForNormalization = '1.' + mantissaBits
        } else {
          // subnormal: leading 0.
          sourceForNormalization = '0.' + mantissaBits
        }
      }

      const normalizeBinaryString = (binStr) => {
        let s = binStr.replace(/^([+\-])/, '')
        const signPrefix = binStr.startsWith('-') ? '-' : ''
        if (!s.includes('.')) s = s + '.0'
        // Remove leading zeros on integer part except keep one if all zeros
        let [intPart, fracPart] = s.split('.')
        if (/^0+$/.test(intPart)) {
          // find first 1 in fractional
            const idx = fracPart.indexOf('1')
            if (idx === -1) {
              return { norm: signPrefix + '0', exponent: 0, mantissaDisplay: '0', from: binStr }
            }
            const exponent = - (idx + 1)
            const mantissaTail = fracPart.slice(idx + 1)
            return { norm: signPrefix + '1.' + mantissaTail, exponent, mantissaDisplay: '1.' + mantissaTail, from: binStr }
        } else {
          // integer part has a 1; shift so first 1 is left of decimal
          const firstOne = intPart.indexOf('1')
          const shift = intPart.length - firstOne - 1
          const significand = intPart.slice(firstOne + 1) + fracPart
          return { norm: signPrefix + '1.' + significand, exponent: shift, mantissaDisplay: '1.' + significand, from: binStr }
        }
      }

      let normalized = normalizeBinaryString(sourceForNormalization)
      if (biasedExponent === 0xFF) {
        normalized = { norm: 'Special', exponent: NaN, mantissaDisplay: 'Special', from: sourceForNormalization }
      }
      if (number === 0) {
        normalized = { norm: '0', exponent: 0, mantissaDisplay: '0', from: sourceForNormalization }
      }
      
      return `
        <div class="ieee-representation">
          
          <div style="margin-bottom: 24px; text-align: center;">
            <div style="font-size: 1.1rem; color: var(--gt-light-gold); margin-bottom: 8px;">
              <strong>Input:</strong> ${( () => { const bi = String(binaryInput||''); if (/^[+-]?[01]+(\.[01]+)?$/.test(bi)) { const signChr = bi.startsWith('-') ? '-' : '+'; const mag = bi.replace(/^[+-]/,''); return '('+signChr+') '+mag } return binaryInput })()} → <strong>Decimal:</strong> ${number}
            </div>
          </div>
          
          <div class="bit-labels">
            ${bitLabels.map(label => `<div class="bit-label">${label}</div>`).join('')}
          </div>
          
          <div class="bit-display" data-role="bit-display">
            <div class="bit sign-bit" data-index="31" title="Sign Bit: ${sign === 0 ? 'Positive' : 'Negative'}">${signBit}</div>
            ${exponentBits.split('').map((bit, index) => `<div class="bit exponent-bit" data-index="${30-index}" title="Exponent Bit ${7-index}">${bit}</div>`).join('')}
            ${mantissaBits.split('').map((bit, index) => `<div class="bit mantissa-bit" data-index="${22-index}" title="Mantissa Bit ${22-index}">${bit}</div>`).join('')}
          </div>
          <div class="bit-brackets">
            <div class="bracket-segment sign" style="width:3.125%">Sign<br><small>${sign}</small></div>
            <div class="bracket-segment exponent" style="width:25%">Exponent<br><small>${biasedExponent} (biased)</small></div>
            <div class="bracket-segment mantissa" style="width:71.875%">Mantissa<br><small>${mantissaBits.slice(0,8)}…</small></div>
          </div>
          <div class="normalized-breakdown">
            <div><span class="piece-label">Normalized:</span> <code>${normalized.norm}</code> × 2<sup>${normalized.exponent}</sup></div>
            <div><span class="piece-label">IEEE Interpretation:</span> (<code>${sign === 1 ? '-1' : '1'}</code>) × <code>${biasedExponent === 0 ? '0.' + mantissaBits : '1.' + mantissaBits}</code> × 2<sup>${actualExponent}</sup></div>
          </div>
          
          <div class="legend">
            <div class="legend-item">
              <div class="legend-color sign-bit"></div>
              <span>Sign (1 bit)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color exponent-bit"></div>
              <span>Exponent (8 bits)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color mantissa-bit"></div>
              <span>Mantissa (23 bits)</span>
            </div>
          </div>
        </div>
        
        <div class="calculations">
          <div class="calc-section">
            <div class="calc-title">Sign</div>
            <div class="calc-step">Bit: ${sign}</div>
            <div class="calc-step">Value: ${sign === 0 ? 'Positive (+)' : 'Negative (-)'}</div>
            <div class="calc-step">Toggle using + / - buttons or by clicking sign bit.</div>
          </div>
          
          <div class="calc-section">
            <div class="calc-title">Exponent
              <button type="button" class="help-btn bias-info-btn" title="Why bias is 127?" onclick="const p=this.parentElement.parentElement.querySelector('.bias-popup'); p.classList.toggle('open'); event.stopPropagation();">?</button>
            </div>
            <div class="bias-popup">
              <div><strong>Why 127?</strong> 8 bits can hold numbers <code>[0, 255]</code></div><br>
              <div><strong>We want both negative & positive powers around 0:</strong> use bias of 2<sup>7</sup>-1 = <code>127</code> which is in between -126 and +127.</div><br>
              <div><strong>Why not 2's complement:</strong> Easier to read. With biased exponents, larger exponents always mean larger magnitudes when comparing floating point numbers (ignoring sign). </div>

            </div>
            <div class="calc-step">Bits: ${exponentBits}</div>
            <div class="calc-step">Biased: ${biasedExponent}</div>
            <div class="calc-step">Actual: ${biasedExponent} - 127 = ${actualExponent}</div>
            ${(() => {
              if (biasedExponent === 0xFF) {
                return `<div class=\"calc-step exp-algebra\"><span class=\"exp-label\">Algebra:</span> <span class=\"exp-bits\">255</span> indicates special (Inf/NaN) – no k derivation.</div>`
              }
              if (biasedExponent === 0) {
                // Subnormal or zero: actual exponent = 1 - bias = -126
                return `<div class=\"calc-step exp-algebra\">` +
                  `<div><span class=\"exp-label\">Pattern:</span> exponent field all zeros → subnormal/zero handling</div>` +
                  `<div><span class=\"exp-label\">Algebra:</span> <span class=\"exp-bits\">0</span> = (k + <span class=\"exp-bias\">127</span>) (reserved) → k = 1 - 127 = <span class=\"exp-actual\">-126</span></div>` +
                  `<div><span class=\"exp-label\">Note:</span> leading significand is <span class=\"exp-implied\">0.</span> not 1.</div>` +
                `</div>`
              }
                // Contextual explanation if original input was a binary literal
                let contextual = ''
                if (binaryInput && /^[+\-]?[01]+(\.[01]+)?$/.test(binaryInput)) {
                  const userNorm = normalizeBinaryString(binaryInput)
                  if (userNorm && userNorm.norm !== '0' && !Number.isNaN(userNorm.exponent)) {
                    const k = userNorm.exponent
                    const stored = k + 127
                    const shiftPhrase = k > 0 ? `${k} place(s) left` : (k < 0 ? `moved ${-k} place(s) right` : 'no shift needed')
                    contextual = `<div class=\"exp-context\">` +
                      `<div><span class=\"exp-label\">From input:</span> <code class=\"exp-binary\">${binaryInput}</code> = <code class=\"exp-binary\">${userNorm.norm}</code> × 2<sup><span class=\"exp-origin\">${k}</span></sup></div>` +
                      `<div><span class=\"exp-label\">k (shift count):</span>${shiftPhrase}</div>` +
                      `<div><span class=\"exp-label\">Stored exponent:</span> k + bias = <span class=\"exp-origin\">${k}</span> + <span class=\"exp-bias\">127</span> = <span class=\"exp-bits\">${stored}</span> = <code class=\"exp-bits\">${exponentBits}</code></div>` +
                    `</div>`
                  }
                }
                  if (contextual) {
                    return `<div class=\"calc-step exp-algebra\">${contextual}</div>`
                  }
                  return ''
            })()}
          </div>
          
          <div class="calc-section">
            <div class="calc-title">Mantissa</div>
            <div class="calc-step">Bits: ${mantissaBits}</div>
            <div class="calc-step">Value: 1 + ${mantissa}/2<sup>23</sup></div>
            <div class="calc-step">Result: ${mantissaValue.toFixed(10)}</div>
            ${(() => {
              // Provide contextual derivation for mantissa from normalized form
              if (binaryInput && /^[+\\-]?[01]+(\.[01]+)?$/.test(binaryInput) && biasedExponent !== 0xFF) {
                const userNorm = normalizeBinaryString(binaryInput)
                if (userNorm && userNorm.norm.startsWith('1.') || (biasedExponent===0 && userNorm.norm.startsWith('1.'))) {
                  const fraction = userNorm.norm.split('.')[1] || ''
                  const taken = fraction.slice(0,23)
                  const padded = taken.padEnd(23,'0')
                  let extra = ''
                  if (fraction.length < 23) extra = ` (padded with ${23 - fraction.length} zero${23-fraction.length===1?'':'s'})`
                  if (fraction.length > 23) extra = ` (truncated after 23 bits)`
                  return `<div class=\"mantissa-context\">` +
                    `<div><span style=\"color:var(--gt-gold); font-weight:600;\">Normalized:</span> <code>${userNorm.norm}</code></div>` +
                    `<div>Take first 23 bits after decimal: <code>${taken || '0'.repeat(23)}</code>${extra}</div>` +
                    `<div>Stored mantissa field = <code>${padded}</code></div>` +
                  `</div>`
                }
              }
              return ''
            })()}
          </div>
        </div>
        
        <div class="result">
          IEEE 754 Result: ${sign === 0 ? '+' : '-'} ${mantissaValue.toFixed(10)} × 2^${actualExponent} = ${view.getFloat32(0)}
        </div>
      `
    }

    const handleKeypress = (event) => {
      // Allow control keys (backspace, delete, arrow keys, etc.)
      if (event.ctrlKey || event.metaKey || 
          ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(event.key)) {
        return
      }

      const char = event.key
      const currentValue = event.target.value
      const cursorPosition = event.target.selectionStart
      if (inputMode.value === 'binary') {
        // For binary mode, allow only 0, 1, ., -, and special value characters
        const allowedBinaryChars = /^[01.\-infan]$/i;
        if (!allowedBinaryChars.test(char)) {
          event.preventDefault();
          return;
        }
        
        // Additional validation for binary input
        if (char === '.') {
          // Only allow one decimal point
          if (currentValue.includes('.')) {
            event.preventDefault();
            return;
          }
        } else if (char === '-') {
          // Only allow minus at the beginning
          if (cursorPosition !== 0 || currentValue.includes('-')) {
            event.preventDefault();
            return;
          }
        }
      } else {
        // For decimal mode, allow digits, decimal point, minus sign, and special value characters
        const allowedDecimalChars = /^[0-9.\-einfan]$/i;
        if (!allowedDecimalChars.test(char)) {
          event.preventDefault();
          return;
        }
        
        // Additional validation for decimal input
        if (char === '.') {
          // Only allow one decimal point
          if (currentValue.includes('.')) {
            event.preventDefault();
            return;
          }
        } else if (char === '-') {
          // Only allow minus at the beginning or after 'e' for scientific notation
          const beforeCursor = currentValue.substring(0, cursorPosition);
          const lastChar = beforeCursor[beforeCursor.length - 1];
          if (cursorPosition !== 0 && lastChar !== 'e' && lastChar !== 'E') {
            event.preventDefault();
            return;
          }
        } else if (char.toLowerCase() === 'e') {
          // Only allow one 'e' for scientific notation
          if (currentValue.toLowerCase().includes('e')) {
            event.preventDefault();
            return;
          }
        }
      }
    }
    
    const handleInput = (event) => {
      // Clean up the input value after each input event
      let value = event.target.value;
      
      if (inputMode.value === 'binary') {
        // Remove any characters that shouldn't be in binary input
        value = value.replace(/[^01.\-infan]/gi, '');
      } else {
        // Remove any characters that shouldn't be in decimal input
        value = value.replace(/[^0-9.\-einfan]/gi, '');
      }
      
      // Update the input value if it was cleaned
      if (value !== event.target.value) {
        inputValue.value = value;
        // Set cursor position to the end
        setTimeout(() => {
          event.target.setSelectionRange(value.length, value.length);
        }, 0);
      }
      
      updateVisualization();
    }

    const setInputMode = (mode) => {
      inputMode.value = mode
      updateVisualization()
    }

    const updateVisualization = () => {
      const special = parseSpecialInput(inputValue.value)

      if (special !== null) {
        visualizationHtml.value = generateFloat32Visualization(special, inputValue.value)
        return
      }

      if (inputMode.value === 'decimal') {
        // In decimal mode, try to parse as decimal number
        const decimalMatch = inputValue.value.trim().match(/^-?\d+(\.\d+)?$/)
        if (decimalMatch) {
          const decimalNumber = parseFloat(inputValue.value)
          visualizationHtml.value = generateFloat32Visualization(decimalNumber, `${inputValue.value} (decimal)`)
          return
        } else if (inputValue.value.trim() !== '') {
          // Invalid decimal input
          visualizationHtml.value = `
            <div class="calc-section" style="text-align: center; background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(185, 28, 28, 0.1)); border: 1px solid rgba(220, 38, 38, 0.3);">
              <div class="calc-title" style="color: #FCA5A5;">⚠ Invalid Decimal Input</div>
              <div style="color: var(--text-secondary); margin-top: 12px;">
                Please enter a valid decimal number: <code style="color: var(--gt-gold);">-5.25</code>, <code style="color: var(--gt-gold);">123.456</code><br>
                or special values: <code style="color: var(--gt-gold);">inf</code>, <code style="color: var(--gt-gold);">-inf</code>, <code style="color: var(--gt-gold);">nan</code>
              </div>
            </div>
          `
          return
        }
      } else {
        // In binary mode, allow leading sign
        const raw = inputValue.value.trim()
        const neg = raw.startsWith('-')
        const core = raw.replace(/^[+-]/,'')
        const binaryString = core.replace(/[^01.]/g, '')
        if (binaryString && isValidBinary(binaryString)) {
          let number = binaryToDecimal(binaryString)
          if (neg) number = -number
          visualizationHtml.value = generateFloat32Visualization(number, (neg?'-':'+') + binaryString)
          nextTick(() => attachBitHandlers())
          return
        } else if (raw !== '') {
          // Invalid binary input
          visualizationHtml.value = `
            <div class="calc-section" style="text-align: center; background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(185, 28, 28, 0.1)); border: 1px solid rgba(220, 38, 38, 0.3);">
              <div class="calc-title" style="color: #FCA5A5;">⚠ Invalid Binary Input</div>
              <div style="color: var(--text-secondary); margin-top: 12px;">
                Please enter a valid binary number: <code style="color: var(--gt-gold);">100.001</code>, <code style="color: var(--gt-gold);">1101</code><br>
                or special values: <code style="color: var(--gt-gold);">inf</code>, <code style="color: var(--gt-gold);">-inf</code>, <code style="color: var(--gt-gold);">nan</code>
              </div>
            </div>
          `
          return
        }
      }
      
      // Empty input
      if (inputValue.value.trim() === '') {
        visualizationHtml.value = ''
      } else {
        // Have a visualization; attach handlers
        nextTick(() => attachBitHandlers())
      }
    }

    onMounted(() => {
      updateVisualization()
    })

    const setSign = (s) => {
      signToggle.value = s
      // Flip sign bit in currentBits
      let bits = currentBits.value >>> 0
      bits = s === '-' ? (bits | 0x80000000) >>> 0 : (bits & 0x7FFFFFFF) >>> 0
      currentBits.value = bits
      const buf = new ArrayBuffer(4)
      const dv = new DataView(buf)
      dv.setUint32(0, bits)
      const val = dv.getFloat32(0)
      if (inputMode.value === 'decimal') {
        inputValue.value = String(val)
      } else {
        const exp = (bits >>> 23) & 0xFF
        const man = bits & 0x7FFFFF
        const actual = exp - 127
        const manStr = man.toString(2).padStart(23,'0')
        const sub = exp === 0 && man !== 0
        const plain = buildPlainBinaryFromFields(bits >>> 31, actual, manStr, sub)
  inputValue.value = formatBinaryLiteral(plain)
      }
      updateVisualization()
    }

    const attachBitHandlers = () => {
      const container = document.querySelector('.ieee-root .bit-display[data-role="bit-display"]')
      if (!container) return
      // Delegate to container to survive re-renders
      if (!container.__attached) {
        container.addEventListener('click', (e) => {
          const el = e.target.closest('.bit')
          if (!el) return
          const idx = parseInt(el.getAttribute('data-index'))
          if (isNaN(idx)) return
          let bits = currentBits.value >>> 0
          const mask = 1 << idx
          bits = (bits ^ mask) >>> 0
          currentBits.value = bits
          const buf = new ArrayBuffer(4)
          const dv = new DataView(buf)
          dv.setUint32(0, bits)
          const val = dv.getFloat32(0)
          if (inputMode.value === 'decimal') {
            inputValue.value = String(val)
          } else {
            const sign = (bits >>> 31) & 1
            const exp = (bits >>> 23) & 0xFF
            const man = bits & 0x7FFFFF
            const actual = exp - 127
            const manStr = man.toString(2).padStart(23,'0')
            const sub = exp === 0 && man !== 0
            const plain = buildPlainBinaryFromFields(sign, actual, manStr, sub)
            inputValue.value = formatBinaryLiteral(plain)
          }
          updateVisualization()
        })
        container.__attached = true
      }
    }

    return {
      inputValue,
      visualizationHtml,
      updateVisualization,
      showHelp,
      inputMode,
      setInputMode,
      handleKeypress,
  handleInput,
  setSign
    }
  }
}
</script>
