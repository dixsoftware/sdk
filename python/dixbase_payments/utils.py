import re


def to_snake(value):
    return re.sub(r"(?<!^)([A-Z])", r"_\1", value).lower()


def to_camel(value):
    return re.sub(r"_([a-z])", lambda match: match.group(1).upper(), value)


def transform_keys(value, transform, preserve=("metadata",)):
    if isinstance(value, list):
        return [transform_keys(item, transform, preserve) for item in value]
    if not isinstance(value, dict):
        return value

    result = {}
    for key, item in value.items():
        next_key = transform(key) if isinstance(key, str) else key
        result[next_key] = item if key in preserve else transform_keys(item, transform, preserve)
    return result
