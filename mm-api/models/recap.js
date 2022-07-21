const db = require("../db");
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} = require("../utils/errors");
require("dotenv").config();

class Recap {
  // amount of people they work with on some category
  static async peopleWorkedWithPerCategory(userId, category) {
    const text = `
            SELECT people_with AS "peopleWith", COUNT(*) AS "times"
            FROM completed as c
                INNER JOIN tasks as t ON c.user_id=t.user_id AND c.task_id=t.task_id
            WHERE c.user_id=$1 AND t.category=$2
            GROUP BY c.people_with
            ORDER BY c.people_with ASC
        `;

    const values = [userId, category.toLowerCase()];
    const result = await db.query(text, values);

    let maxPeople = 0;
    result.rows.forEach((peopleWithAndTimes) => {
      if (peopleWithAndTimes.peopleWith > maxPeople) {
        maxPeople = peopleWithAndTimes.peopleWith;
      }
    });

    let labels = [];
    let actualData = [];
    for (let i = 0; i < maxPeople + 1; i++) {
      labels.push(i);
      actualData.push(0);
    }

    result.rows.forEach((peopleWithAndTimes) => {
      actualData[peopleWithAndTimes.peopleWith] = Number(
        peopleWithAndTimes.times
      );
    });

    const reducer = (accumulator, curr) => accumulator + curr;
    if (actualData.reduce(reducer) === 0) {
      return;
    }

    return {
      type: "horizontalBar",
      label: `Amount of People Worked with in ${category}s`,
      yAxisLabel: "# of People",
      xAxisLabel: `# of ${category}s`,
      labels: labels,
      actualData: actualData,
    };
  }

  // see if student has been on time with all of their assignments
  static async assignmentsLate(userId) {
    const text = `
        SELECT c.on_time, COUNT(*)
        FROM completed as c
        WHERE c.user_id=$1
        GROUP BY c.on_time
        `;
    const values = [userId];
    const result = await db.query(text, values);

    let labels = ["Late", "On Time"];
    let actualData = [0, 0];
    result.rows.forEach((onTimeAndCount) => {
      if (onTimeAndCount.on_time === false) {
        actualData[0] = Number(onTimeAndCount.count);
      } else if (onTimeAndCount.on_time === true) {
        actualData[1] = Number(onTimeAndCount.count);
      }
    });

    if (actualData[0] + actualData[1] === 0) {
      return null;
    }
    return {
      type: "doughnut",
      label: `Assignment Timeliness by Amount`,
      labels: labels,
      actualData: actualData,
    };
  }

  // See where the user is allocating most of their time
  static async timeSpentPerCategory(userId) {
    const text = `
        SELECT t.category, SUM(c.time_spent) AS "total_time_spent"
        FROM completed as c
            INNER JOIN tasks as t ON c.user_id=t.user_id AND c.task_id=t.task_id
        WHERE c.user_id=$1 
        GROUP BY t.category
        `;
    const values = [userId];
    const result = await db.query(text, values);

    let labels = [];
    let actualData = [];
    result.rows.forEach((catAndSum) => {
      labels.push(catAndSum.category);
      actualData.push(Number(catAndSum.total_time_spent));
    });
    if (actualData.length === 0) {
      return null;
    }
    return {
      type: "doughnut",
      label: "Total Time Spent Per Category (in minutes)",
      labels: labels,
      actualData: actualData,
    };
  }

  static async assignmentsPerMonth(userId) {
    const text = `
            SELECT EXTRACT(MONTH FROM due_date), COUNT(EXTRACT(MONTH FROM due_date))
            FROM tasks as t
            WHERE t.user_id=$1
            GROUP BY EXTRACT(MONTH FROM due_date)
            ORDER BY EXTRACT(MONTH FROM due_date) ASC            
        `;
    // this query only gives back ONLY months with the amount of assignments
    // that are due in the month (does not return 0 for months that don't have tasks)

    const values = [userId];
    const result = await db.query(text, values);

    let labels = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let actualData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    result.rows.forEach((monthAndCount) => {
      actualData[monthAndCount.extract - 1] = Number(monthAndCount.count);
    });

    const reducer = (accumulator, curr) => accumulator + curr;
    if (actualData.reduce(reducer) === 0) {
      return;
    }
    return {
      type: "line",
      label: `Tasks per Month`,
      yAxisLabel: "# of Tasks",
      xAxisLabel: "Due Date Month",
      labels: labels,
      actualData: actualData,
    };
  }

  static async letterGradesPerCategory(userId, category) {
    const text = `
            SELECT  COUNT(*) FILTER (WHERE c.score >= 90) AS "A",
                COUNT(*) FILTER (WHERE c.score BETWEEN 80 AND 89.99) AS "B",
                COUNT(*) FILTER (WHERE c.score BETWEEN 70 AND 79.99) AS "C",
                COUNT(*) FILTER (WHERE c.score BETWEEN 60 AND 69.99) AS "D",
                COUNT(*) FILTER (WHERE c.score < 60) AS "F"
            FROM completed as c
                INNER JOIN tasks as t ON c.user_id=t.user_id AND c.task_id=t.task_id
            WHERE c.user_id=$1 AND t.category=$2
        `;

    const values = [userId, category.toLowerCase()];
    const result = await db.query(text, values);

    let labels = [];
    let actualData = [];
    let fieldsInRow = ["A", "B", "C", "D", "F"];
    fieldsInRow.forEach((letter) => {
      if (result.rows[0][letter] != 0) {
        labels.push(letter);
        actualData.push(Number(result.rows[0][letter]));
      }
    });
    if (actualData.length === 0) {
      return null;
    }
    return {
      type: "pie",
      label: `Distribution of Letter Grades for ${category}s`,
      labels: labels,
      actualData: actualData,
    };
  }

  static async averagePerCategory(userId) {
    const text = `
        SELECT t.category, ROUND(AVG(c.score)::numeric, 2) AS "average"
        FROM completed as c
            INNER JOIN tasks as t ON c.user_id=t.user_id AND c.task_id=t.task_id
        WHERE c.user_id=$1 
        GROUP BY t.category
        `;
    const values = [userId];
    const result = await db.query(text, values);

    let labels = [];
    let actualData = [];
    result.rows.forEach((catPlusAverage) => {
      labels.push(catPlusAverage.category);
      actualData.push(Number(catPlusAverage.average));
    });
    if (actualData.length === 0) {
      return null;
    }
    return {
      type: "bar",
      label: "Average % Score Per Category",
      labels: labels,
      actualData: actualData,
    };
  }

  static async maxMinPerCategory(userId) {
    //create stats for max and min of every category
    const text = `
        SELECT t.category, MAX(c.score) AS "max", MIN(c.score) AS "min"
        FROM completed as c
            INNER JOIN tasks as t ON c.user_id=t.user_id AND c.task_id=t.task_id
        WHERE c.user_id=$1 
        GROUP BY t.category`;

    const values = [userId];
    const result = await db.query(text, values);

    let labels = [];
    let actualData = [[], []];
    result.rows.forEach((catPlusMaxMin) => {
      labels.push(catPlusMaxMin.category);
      actualData[0].push(catPlusMaxMin.min);
      actualData[1].push(catPlusMaxMin.max);
    });
    if (actualData[0].length === 0) {
      return null;
    }

    return {
      type: "doubleBar",
      label: "Max and Min per Category",
      labels: labels,
      actualData: actualData,
    };
  }

  static async getFactsByUserId(userId) {
    let listOfFacts = [];
    let statisticRetrieved = null;

    // Averages per Categories Bar Chart
    statisticRetrieved = await Recap.averagePerCategory(userId);
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // Test Pie Chart
    statisticRetrieved = await Recap.letterGradesPerCategory(userId, "Test");
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // Project Pie Chart
    statisticRetrieved = await Recap.letterGradesPerCategory(userId, "Project");
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // Quiz Pie Chart
    statisticRetrieved = await Recap.letterGradesPerCategory(userId, "Quiz");
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // Max and min for each category the user has completed
    statisticRetrieved = await Recap.maxMinPerCategory(userId);
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // Total # of Assignments per Month
    statisticRetrieved = await Recap.assignmentsPerMonth(userId);
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // See where students spends most of their time on
    statisticRetrieved = await Recap.timeSpentPerCategory(userId);
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // See if user is being responsible and not turning
    // in majority of assignments late
    statisticRetrieved = await Recap.assignmentsLate(userId);
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }
    // # of tasks per category in which they have worked with x amount
    // of other people
    statisticRetrieved = await Recap.peopleWorkedWithPerCategory(
      userId,
      "Project"
    );
    if (statisticRetrieved !== null) {
      listOfFacts.push(statisticRetrieved);
    }

    return listOfFacts;
  }

  // {
  //     “type”: “type of graph”,
  //      “label”: “title of the graph”,
  //     “labels”: [“cat1”, “cat2”, ... “catx”],
  //     “actualData”: [1, 2, 3, 4, 5]
  // }
}

module.exports = Recap;
