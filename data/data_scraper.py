import dataclasses
import json
import pandas as pd
import urllib
from bs4 import BeautifulSoup
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Tuple

# URL for South Africa, change as appropriate
url = "http://www.gcatholic.org/calendar/{0}/ZA-en.htm"


@dataclass
class Celebration:
    date: str
    name: str
    colour: str
    importance: str
    season: str


importance_map = {
    "S": "Solemnity",
    "F": "Feast",
    "M": "Memorial",
    "m": "Optional Memorial",
    "m*": "Optional Commemoration"
}


def bs4_replace_colour_span_with_string(soup, class_name: str, replace: str):
    for colour in soup.find_all("span", attrs={"class": class_name}):
        colour.replace_with(replace)


def is_int(value):
    try:
        int(value)
        return True
    except ValueError:
        return False


def extract_colour_token(name: str) -> Tuple[str, str]:
    tokens = ["<<WHITE>>", "<<GREEN>>", "<<RED>>", "<<PURPLE>>"]
    found = []
    for token in tokens:
        if name.find(token):
            name = name.replace(token, "")
            found.append(token)
    return name, found[0][2:-2]


def advance_date_by_one(df, table_row_index, current_date):
    """If there are multiple events on that day, do not advance day tracker"""
    try:
        if df.iloc[table_row_index]["day_of_month"] is not df.iloc[table_row_index + 1]["day_of_month"]:
            return current_date + timedelta(days=1)
    except IndexError:
        pass
    return current_date


def dataframe_to_data(df: pd.DataFrame) -> List[Celebration]:
    data: List[Celebration] = []
    current_date = datetime.fromisoformat(f"{current_year}-01-01")
    table_row_index = 0
    while current_date.year == current_year and table_row_index < df.shape[0]:
        row = df.iloc[table_row_index]
        # Row is not a data row
        if len(row) < 3 or not is_int(row["day_of_month"]) or int(row["day_of_month"]) != current_date.day:
            table_row_index += 1
            continue
        # Row is not a celebration
        # if not isinstance(row["importance"], str) and row["day_name"] != "Sunday":
        #     current_date = advance_date_by_one(df, table_row_index, current_date)
        #     table_row_index += 1
        #     continue
        if not isinstance(row["celebration_name"], str):
            row["celebration_name"] = "[Parsing failed]"
        print('-----')
        print(row)
        print(row["importance"])
        print('-----')
        name, colour = extract_colour_token(row["celebration_name"])
        importance = "Ferial"
        if row["day_name"] == "Sunday":
            importance = "Sunday"
        elif isinstance(row["importance"], str):
            importance = importance_map[row["importance"]]
        data.append(Celebration(
            date=current_date.isoformat(),
            name=name,
            colour=colour,
            importance=importance,
            season=row["season"]
        ))
        current_date = advance_date_by_one(df, table_row_index, current_date)
        table_row_index += 1
    return data


if __name__ == "__main__":
    number_of_years = 5
    results: List[Celebration] = []

    for current_year in range(number_of_years):
        current_year = datetime.now().year + current_year
        # Parse web page
        html = urllib.request.urlopen(url.format(current_year)).read()
        soup = BeautifulSoup(html, "html.parser")
        bs4_replace_colour_span_with_string(soup, "featw", "<<WHITE>>")
        bs4_replace_colour_span_with_string(soup, "featg", "<<GREEN>>")
        bs4_replace_colour_span_with_string(soup, "featr", "<<RED>>")
        bs4_replace_colour_span_with_string(soup, "featv", "<<PURPLE>>")
        table = soup.find_all("table", attrs={"class": "tb"})
        df = pd.read_html(str(table))[0]
        df.columns = ["season", "day_of_month", "day_name", "importance", "celebration_name"]

        # Transform web page to database
        results += dataframe_to_data(df)
    print(json.dumps(list(dataclasses.asdict(d) for d in results)))
