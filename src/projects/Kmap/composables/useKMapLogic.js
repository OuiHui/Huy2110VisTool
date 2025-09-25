export function useKMapLogic() {
  
  const findGroups = (ones, variables) => {
    if (ones.length === 0) return []
    const oneNums = ones.map(t => parseInt(t, 2))
    // Generate all power-of-two sized groups (prime implicant candidates)
    const candidateGroups = findAllPossibleGroups(oneNums, variables)
    // Keep only groups that are not contained within a larger candidate with identical expression (prime implicants)
    const withExpr = candidateGroups.map(g => ({ cells: g, expr: groupToExpression(g, variables) }))
    const primes = withExpr.filter((g, i, arr) => {
      return !arr.some(other => other !== g && other.cells.length > g.cells.length && g.cells.every(c => other.cells.includes(c)) && other.expr === g.expr)
    })

    // Build coverage table: which primes cover which minterms
    const minterms = [...new Set(oneNums)].sort((a,b)=>a-b)
    const coverage = primes.map(p => new Set(p.cells))

    const chosen = []
    const uncovered = new Set(minterms)

    // 1. Essential prime implicants: minterms covered by only one prime
    const markEssentials = () => {
      let added = false
      minterms.forEach(m => {
        if (!uncovered.has(m)) return
        const covering = primes.filter((p, idx) => coverage[idx].has(m))
        if (covering.length === 1) {
          const pi = covering[0]
          if (!chosen.includes(pi)) {
            chosen.push(pi)
            // remove all cells it covers
            pi.cells.forEach(c => uncovered.delete(c))
            added = true
          }
        }
      })
      return added
    }
    while (markEssentials()) {/* repeat until stable */}

    // 2. If uncovered remain, choose primes that cover most uncovered (heuristic set cover)
    while (uncovered.size > 0) {
      let best = null
      let bestCover = 0
      primes.forEach(p => {
        if (chosen.includes(p)) return
        const coverCount = p.cells.filter(c => uncovered.has(c)).length
        if (coverCount > bestCover || (coverCount === bestCover && p.cells.length > (best?.cells.length||0))) {
          best = p
          bestCover = coverCount
        }
      })
      if (!best || bestCover === 0) break
      chosen.push(best)
      best.cells.forEach(c => uncovered.delete(c))
    }

    // 3. Remove any chosen implicant whose expression is duplicate and whose cells are fully covered by others
    for (let i = chosen.length -1; i >=0; i--) {
      const pi = chosen[i]
      const otherCells = new Set()
      chosen.forEach((o,j)=> { if (j!==i) o.cells.forEach(c=>otherCells.add(c)) })
      if (pi.cells.every(c => otherCells.has(c))) {
        // ensure its expression not unique to final expression set
        const exprCount = chosen.filter(o=>o.expr===pi.expr).length
        if (exprCount>1) chosen.splice(i,1)
      }
    }

    // Sort by descending size then expression for stable UI
    chosen.sort((a,b)=> b.cells.length - a.cells.length || a.expr.localeCompare(b.expr))

    return chosen.map(p => ({
      terms: p.cells.map(num => num.toString(2).padStart(variables, '0')),
      size: p.cells.length,
      expression: p.expr
    }))
  }

  const findAllPossibleGroups = (ones, variables) => {
    const allGroups = []
    const maxSize = Math.pow(2, variables)
    
    for (let size = maxSize; size >= 1; size /= 2) {
      const groupsOfSize = findAllGroupsOfSize(ones, size, variables)
      allGroups.push(...groupsOfSize)
    }
    
    return allGroups
  }

  const findAllGroupsOfSize = (ones, targetSize, variables) => {
    let patterns = {}
    
    if (variables === 2) {
      patterns = {
        1: ones.map(num => [num]),
        2: [
          [0, 1], [2, 3], // horizontal pairs
          [0, 2], [1, 3]  // vertical pairs
        ],
        4: [[0, 1, 2, 3]]
      }
    } else if (variables === 3) {
      patterns = {
        1: ones.map(num => [num]),
        2: [
          [0, 1], [1, 3], [3, 2], [2, 0], // top row adjacencies
          [4, 5], [5, 7], [7, 6], [6, 4], // bottom row adjacencies
          [0, 4], [1, 5], [2, 6], [3, 7]  // vertical pairs
        ],
        4: [
          [0, 1, 3, 2], [4, 5, 7, 6], // horizontal rectangles
          [0, 1, 4, 5], [1, 3, 5, 7], [3, 2, 7, 6], [2, 0, 6, 4], // vertical rectangles
          [0, 2, 4, 6], [1, 3, 5, 7] // diagonal patterns
        ],
        8: [[0, 1, 2, 3, 4, 5, 6, 7]]
      }
    } else if (variables === 4) {
      patterns = {
        1: ones.map(num => [num]),
        2: generate4VarPairs(),
        4: generate4VarQuads(),
        8: generate4VarOctets(),
        16: [[...Array(16).keys()]]
      }
    }

    const validGroups = []
    for (let pattern of patterns[targetSize] || []) {
      if (pattern.every(num => ones.includes(num))) {
        validGroups.push(pattern)
      }
    }
    return validGroups
  }

  const generate4VarPairs = () => {
    const pairs = []
    const gray = [0, 1, 3, 2]

    // Horizontal pairs
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const a = (gray[row] << 2) | gray[col]
        const b = (gray[row] << 2) | gray[(col + 1) % 4]
        pairs.push([a, b])
      }
    }
    // Vertical pairs
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        const a = (gray[row] << 2) | gray[col]
        const b = (gray[(row + 1) % 4] << 2) | gray[col]
        pairs.push([a, b])
      }
    }
    return pairs
  }

  const generate4VarQuads = () => {
    const quads = []
    const gray = [0, 1, 3, 2]

    // 2x2 blocks
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        quads.push([
          (gray[row] << 2) | gray[col],
          (gray[row] << 2) | gray[(col + 1) % 4],
          (gray[(row + 1) % 4] << 2) | gray[col],
          (gray[(row + 1) % 4] << 2) | gray[(col + 1) % 4]
        ])
      }
    }

    // 1x4 horizontal (entire row)
    for (let row = 0; row < 4; row++) {
      quads.push([
        (gray[row] << 2) | gray[0],
        (gray[row] << 2) | gray[1],
        (gray[row] << 2) | gray[2],
        (gray[row] << 2) | gray[3]
      ])
    }

    // 4x1 vertical (entire column)
    for (let col = 0; col < 4; col++) {
      quads.push([
        (gray[0] << 2) | gray[col],
        (gray[1] << 2) | gray[col],
        (gray[2] << 2) | gray[col],
        (gray[3] << 2) | gray[col]
      ])
    }

    return quads
  }

  const generate4VarOctets = () => {
    const octets = []
    const gray = [0, 1, 3, 2]

    // 2x4 blocks (two rows)
    for (let row = 0; row < 4; row++) {
      const octet = []
      for (let dr = 0; dr < 2; dr++) {
        for (let col = 0; col < 4; col++) {
          octet.push((gray[(row + dr) % 4] << 2) | gray[col])
        }
      }
      octets.push(octet)
    }

    // 4x2 blocks (two columns)
    for (let col = 0; col < 4; col++) {
      const octet = []
      for (let row = 0; row < 4; row++) {
        for (let dc = 0; dc < 2; dc++) {
          octet.push((gray[row] << 2) | gray[(col + dc) % 4])
        }
      }
      octets.push(octet)
    }

    return octets
  }

  const groupToExpression = (group, variables) => {
    if (group.length === 1) {
      return termToExpression(group[0].toString(2).padStart(variables, '0'), variables)
    }
    
    const firstTerm = group[0].toString(2).padStart(variables, '0')
    const constants = []
    
    for (let i = 0; i < variables; i++) {
      const bit = firstTerm[i]
      if (group.every(num => {
        const term = num.toString(2).padStart(variables, '0')
        return term[i] === bit
      })) {
        constants.push({
          variable: ['A', 'B', 'C', 'D'][i],
          value: bit
        })
      }
    }
    
    if (constants.length === 0) return '1'
    
    return constants.map(c => c.value === '1' ? c.variable : c.variable + "'").join('')
  }

  const termToExpression = (term, variables) => {
    const variableNames = ['A', 'B', 'C', 'D'].slice(0, variables)
    return term.split('').map((bit, index) => {
      return bit === '1' ? variableNames[index] : variableNames[index] + "'"
    }).join('')
  }

  const generateSimplifiedExpression = (kmap, groups, variables) => {
    const ones = Object.keys(kmap).filter(key => kmap[key] === '1')
    
    if (ones.length === 0) {
      return 'F = 0'
    }
    
    if (groups.length === 0) {
      const minterms = ones.map(term => termToExpression(term, variables))
      return 'F = ' + minterms.join(' + ')
    } else {
      const expressions = groups.map(group => group.expression)
      return 'F = ' + expressions.join(' + ')
    }
  }

  return {
    findGroups,
    generateSimplifiedExpression
  }
}
