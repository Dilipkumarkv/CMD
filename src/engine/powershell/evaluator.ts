/**
 * Evaluates a condition against an object in a PowerShell pipeline.
 */

function getPropertyValue(obj: any, propPath: string): any {
  if (!obj || typeof obj !== 'object') return undefined;

  const clean = propPath.replace(/^\$_?\./, '').replace(/^\$PSItem\./, '');
  const keys = Object.keys(obj);

  // Case-insensitive lookup
  const matchKey = keys.find((k) => k.toLowerCase() === clean.toLowerCase());
  if (matchKey) {
    return obj[matchKey];
  }
  return undefined;
}

function compareValues(left: any, op: string, right: any): boolean {
  const normOp = op.toLowerCase();

  // Convert numbers if numeric comparison
  const leftNum = Number(left);
  const rightNum = Number(right);
  const isNumeric = !isNaN(leftNum) && !isNaN(rightNum) && typeof left !== 'boolean';

  switch (normOp) {
    case '-eq':
    case 'eq':
      if (isNumeric) return leftNum === rightNum;
      return String(left).toLowerCase() === String(right).toLowerCase();

    case '-ne':
    case 'ne':
      if (isNumeric) return leftNum !== rightNum;
      return String(left).toLowerCase() !== String(right).toLowerCase();

    case '-gt':
    case 'gt':
      if (isNumeric) return leftNum > rightNum;
      return String(left) > String(right);

    case '-ge':
    case 'ge':
      if (isNumeric) return leftNum >= rightNum;
      return String(left) >= String(right);

    case '-lt':
    case 'lt':
      if (isNumeric) return leftNum < rightNum;
      return String(left) < String(right);

    case '-le':
    case 'le':
      if (isNumeric) return leftNum <= rightNum;
      return String(left) <= String(right);

    case '-like':
    case 'like': {
      const pattern = String(right)
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const reg = new RegExp(`^${pattern}$`, 'i');
      return reg.test(String(left));
    }

    case '-notlike':
    case 'notlike': {
      const pattern = String(right)
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const reg = new RegExp(`^${pattern}$`, 'i');
      return !reg.test(String(left));
    }

    case '-match':
    case 'match': {
      try {
        const reg = new RegExp(String(right), 'i');
        return reg.test(String(left));
      } catch {
        return false;
      }
    }

    default:
      return Boolean(left);
  }
}

/**
 * Evaluates a scriptblock string (e.g. "$_.CPU -gt 1") or positional args against an object.
 */
export function evaluateWhereCondition(
  item: any,
  scriptBlock?: string,
  positionalArgs: string[] = [],
  namedParams: Record<string, any> = {}
): boolean {
  if (scriptBlock) {
    const expr = scriptBlock.trim();

    // Match patterns like: $_.Property -op value
    const match = expr.match(/^(\$_\.[a-zA-Z0-9_]+|\$PSItem\.[a-zA-Z0-9_]+)\s+(-[a-zA-Z]+)\s+(.+)$/);
    if (match) {
      const prop = match[1];
      const op = match[2];
      let valStr = match[3].trim();
      // Remove quotes from value if present
      if (
        (valStr.startsWith('"') && valStr.endsWith('"')) ||
        (valStr.startsWith("'") && valStr.endsWith("'"))
      ) {
        valStr = valStr.slice(1, -1);
      }

      const leftVal = getPropertyValue(item, prop);
      return compareValues(leftVal, op, valStr);
    }

    // Bare property existence check: { $_.CPU }
    const bareMatch = expr.match(/^(\$_\.[a-zA-Z0-9_]+|\$PSItem\.[a-zA-Z0-9_]+)$/);
    if (bareMatch) {
      const val = getPropertyValue(item, bareMatch[1]);
      return Boolean(val);
    }
  }

  // Handle positional syntax: Where-Object CPU -gt 1
  if (positionalArgs.length >= 3) {
    const prop = positionalArgs[0];
    const op = positionalArgs[1];
    const val = positionalArgs[2];
    const leftVal = getPropertyValue(item, prop);
    return compareValues(leftVal, op, val);
  }

  // Handle Where-Object -Property CPU -gt 1
  if (namedParams['property']) {
    const prop = namedParams['property'];
    const op = positionalArgs[0] || '-eq';
    const val = positionalArgs[1] || namedParams['value'];
    const leftVal = getPropertyValue(item, prop);
    return compareValues(leftVal, op, val);
  }

  return true;
}
